#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { GateFailure, failureMetadata, trackedPathCatalog, highMetadata } from "./gate-secret-metadata.mjs";

// Keep the existing engine cap below gstack-redact's independent 16 MiB CLI
// ceiling. Large diffs get multiple scans, never a higher cap or skipped paths.
const MAX_SCAN_BYTES = 16_000_000;
const DIAGNOSTICS = process.env.GSTACK_GATE_DIAGNOSTICS === "1";

function readTrackedPaths() {
  const head = process.env.HEAD_SHA;
  if (!/^[0-9a-f]{40}$/.test(head ?? "")) throw new GateFailure("tracked_tree_unavailable");
  const result = spawnSync("git", ["ls-tree", "-r", "-z", head], {
    stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new GateFailure("tracked_tree_unavailable");
  return trackedPathCatalog(result.stdout);
}

function* addedFiles(diff, catalog) {
  let lines = [];
  let sourceLines = [];
  let pathHash;
  let sourceLine;
  let inHunk = false;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      if (lines.length) yield { input: lines.join("\n"), lines, sourceLines, pathHash };
      lines = [];
      sourceLines = [];
      pathHash = undefined;
      sourceLine = undefined;
      inHunk = false;
    } else if (!inHunk && line.startsWith("+++ ")) {
      pathHash = catalog?.headers.get(line.slice(4));
    } else if (line.startsWith("@@ ")) {
      inHunk = true;
      const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      sourceLine = hunk ? Number(hunk[1]) : undefined;
    } else if (line.startsWith("+") && (inHunk || !line.startsWith("+++"))) {
      // Inside a hunk, +++ is an added line beginning ++, not a file header.
      // Keep headerless patches supported for the small contract fixtures.
      if (catalog && (!catalog.hashes.has(pathHash) || !Number.isSafeInteger(sourceLine) || sourceLine < 1)) {
        throw new GateFailure("invalid_metadata");
      }
      lines.push(line.slice(1));
      sourceLines.push(sourceLine);
      if (sourceLine !== undefined) sourceLine += 1;
    } else if (inHunk && line.startsWith(" ") && sourceLine !== undefined) {
      sourceLine += 1;
    }
  }
  if (lines.length) yield { input: lines.join("\n"), lines, sourceLines, pathHash };
}

function* scanBatches(diff, catalog) {
  let files = [];
  let bytes = 0;
  for (const file of addedFiles(diff, catalog)) {
    const size = Buffer.byteLength(file.input, "utf8");
    // Never split a file's additions: the engine has multiline/proximity
    // patterns and unbounded spans, so a fixed overlap cannot prove coverage.
    // A single oversize file still fails closed rather than scanning a prefix.
    if (size > MAX_SCAN_BYTES) throw new GateFailure("file_added_text_too_large", size);
    const separator = files.length ? 1 : 0;
    if (bytes + separator + size > MAX_SCAN_BYTES) {
      yield { input: files.map((file) => file.input).join("\n"), files };
      files = [];
      bytes = 0;
    }
    if (files.length) bytes += 1;
    files.push(file);
    bytes += size;
  }
  // An empty diff still exercises the scanner's availability/exit contract.
  if (files.length) yield { input: files.map((file) => file.input).join("\n"), files };
  else if (bytes === 0) yield { input: "", files: [] };
}

function scan(batch, catalog) {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", [
      "bin/gstack-redact",
      "--repo-visibility", "public",
      "--json",
      "--max-bytes", String(MAX_SCAN_BYTES),
    ], { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stdout.on("error", () => reject(new GateFailure("scanner_output_read_failed")));
    // Scanner stderr may contain sensitive data or exception text. Drain it
    // without forwarding it; fixed failure codes below explain blocked runs.
    child.stderr.on("error", () => reject(new GateFailure("scanner_output_read_failed")));
    child.stderr.resume();
    child.once("error", () => reject(new GateFailure("scanner_spawn_failed")));
    // A clean report cannot establish coverage if writing the payload failed.
    child.stdin.on("error", () => reject(new GateFailure("scanner_input_write_failed")));
    child.once("close", (code) => {
      try {
        let report;
        try { report = JSON.parse(stdout); }
        catch { throw new GateFailure("scanner_no_report"); }
        const high = report?.counts?.HIGH;
        const medium = report?.counts?.MEDIUM;
        if (!Number.isSafeInteger(high) || high < 0 ||
            !Number.isSafeInteger(medium) || medium < 0 ||
            typeof report?.oversize !== "boolean") {
          throw new GateFailure("scanner_invalid_report");
        }
        const expectedCode = high > 0 ? 3 : medium > 0 ? 2 : 0;
        const metadata = catalog && !report.oversize ? highMetadata(report, batch, catalog) : [];
        resolve({ high, medium, metadata, failed: report.oversize || code !== expectedCode });
      } catch (error) { reject(error); }
    });
    child.stdin.end(batch.input);
  });
}

let diff = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { diff += chunk; });
process.stdin.once("error", () => {
  console.error("credential scan: input_read_failed — fail-closed");
  process.exitCode = 1;
});
process.stdin.once("end", async () => {
  let high = 0;
  let medium = 0;
  let batches = 0;
  let bytes = 0;
  let failed = false;
  try {
    const catalog = DIAGNOSTICS ? readTrackedPaths() : undefined;
    for (const batch of scanBatches(diff, catalog)) {
      const result = await scan(batch, catalog);
      if (!Number.isSafeInteger(high + result.high) || !Number.isSafeInteger(medium + result.medium)) {
        throw new GateFailure("scanner_invalid_report");
      }
      high += result.high;
      medium += result.medium;
      failed ||= result.failed;
      batches += 1;
      bytes += Buffer.byteLength(batch.input, "utf8");
      for (const metadata of result.metadata) console.log(`credential finding: ${JSON.stringify(metadata)}`);
    }
    console.log(`credential scan: ${high} high, ${medium} advisory (${batches} batches, ${bytes} input bytes)`);
    // Never overwrite an earlier input-stream failure with success.
    if (high > 0 || failed) process.exitCode = 1;
  } catch (error) {
    console.log(`credential scan: ${high + 1} high, ${medium} advisory (${JSON.stringify(failureMetadata(error))} — fail-closed)`);
    process.exitCode = 1;
  }
});

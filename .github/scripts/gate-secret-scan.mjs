#!/usr/bin/env node
import { spawn } from "node:child_process";

// Keep the existing engine cap below gstack-redact's independent 16 MiB CLI
// ceiling. Large diffs get multiple scans, never a higher cap or skipped paths.
const MAX_SCAN_BYTES = 16_000_000;

function* addedFiles(diff) {
  let lines = [];
  let inHunk = false;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      if (lines.length) yield lines.join("\n");
      lines = [];
      inHunk = false;
    } else if (line.startsWith("@@ ")) {
      inHunk = true;
    } else if (line.startsWith("+") && (inHunk || !line.startsWith("+++"))) {
      // Inside a hunk, +++ is an added line beginning ++, not a file header.
      // Keep headerless patches supported for the small contract fixtures.
      lines.push(line.slice(1));
    }
  }
  if (lines.length) yield lines.join("\n");
}

function* scanBatches(diff) {
  let files = [];
  let bytes = 0;
  for (const input of addedFiles(diff)) {
    const size = Buffer.byteLength(input, "utf8");
    // Never split a file's additions: the engine has multiline/proximity
    // patterns and unbounded spans, so a fixed overlap cannot prove coverage.
    // A single oversize file still fails closed rather than scanning a prefix.
    if (size > MAX_SCAN_BYTES) {
      throw new Error(`one file's added text exceeds ${MAX_SCAN_BYTES} bytes (${size})`);
    }
    const separator = files.length ? 1 : 0;
    if (bytes + separator + size > MAX_SCAN_BYTES) {
      yield files.join("\n");
      files = [];
      bytes = 0;
    }
    if (files.length) bytes += 1;
    files.push(input);
    bytes += size;
  }
  // An empty diff still exercises the scanner's availability/exit contract.
  if (files.length) yield files.join("\n");
  else if (bytes === 0) yield "";
}

function scan(input) {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", [
      "bin/gstack-redact",
      "--repo-visibility", "public",
      "--json",
      "--max-bytes", String(MAX_SCAN_BYTES),
    ], { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "inherit"] });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.once("error", reject);
    // A clean report cannot establish coverage if writing the payload failed.
    // In particular, EPIPE may mean an early-exiting scanner never read it all.
    child.stdin.on("error", reject);
    child.once("close", (code) => {
      let report;
      try {
        report = JSON.parse(stdout);
      } catch {
        reject(new Error(`scanner emitted no report, exit ${code}`));
        return;
      }
      const high = report?.counts?.HIGH;
      const medium = report?.counts?.MEDIUM;
      if (!Number.isSafeInteger(high) || high < 0 ||
          !Number.isSafeInteger(medium) || medium < 0 ||
          typeof report?.oversize !== "boolean") {
        reject(new Error(`scanner emitted an invalid report, exit ${code}`));
        return;
      }
      const expectedCode = high > 0 ? 3 : medium > 0 ? 2 : 0;
      resolve({ high, medium, failed: report.oversize || code !== expectedCode });
    });
    child.stdin.end(input);
  });
}

let diff = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { diff += chunk; });
process.stdin.once("error", (error) => {
  console.error(`credential scan: input error (${error.code ?? "unknown"}) — fail-closed`);
  process.exitCode = 1;
});
process.stdin.once("end", async () => {
  let high = 0;
  let medium = 0;
  let batches = 0;
  let bytes = 0;
  let failed = false;
  try {
    for (const input of scanBatches(diff)) {
      const result = await scan(input);
      high += result.high;
      medium += result.medium;
      failed ||= result.failed;
      batches += 1;
      bytes += Buffer.byteLength(input, "utf8");
    }
    console.log(`credential scan: ${high} high, ${medium} advisory (${batches} batches, ${bytes} input bytes)`);
    // Never overwrite an earlier input-stream failure with success.
    if (high > 0 || failed) process.exitCode = 1;
  } catch (error) {
    console.log(`credential scan: ${high + 1} high, ${medium} advisory (${error.message} — fail-closed)`);
    process.exitCode = 1;
  }
});

import { createHash } from "node:crypto";

// Public-log schema: extend this fixed list only when the engine adds a HIGH
// rule. Never serialize arbitrary strings from a scanner report or exception.
const HIGH_RULE_IDS = new Set([
  "aws.access_key", "aws.secret_key", "github.pat", "github.oauth",
  "github.server", "github.fine_grained", "gitlab.token", "groq.key",
  "tavily.key", "notion.token", "huggingface.token", "npm.token",
  "digitalocean.token", "gcp.service_account", "anthropic.key", "openai.key",
  "sendgrid.key", "stripe.secret", "slack.token", "slack.webhook",
  "discord.webhook", "twilio.auth_token", "google.oauth_client_secret",
  "telegram.bot_token", "pem.private_key", "db.url_with_password",
  "creds.basic_auth_url",
]);
const FAILURE_CODES = new Set([
  "file_added_text_too_large", "tracked_tree_unavailable", "invalid_metadata",
  "scanner_spawn_failed", "scanner_input_write_failed", "scanner_output_read_failed", "scanner_no_report",
  "scanner_invalid_report", "input_read_failed", "gate_failed",
]);

export class GateFailure extends Error {
  constructor(reason, inputBytes) {
    super();
    this.reason = FAILURE_CODES.has(reason) ? reason : "gate_failed";
    this.inputBytes = Number.isSafeInteger(inputBytes) && inputBytes >= 0 ? inputBytes : undefined;
  }
}

export function failureMetadata(error) {
  if (!(error instanceof GateFailure)) return { reason: "gate_failed" };
  return {
    reason: FAILURE_CODES.has(error.reason) ? error.reason : "gate_failed",
    ...(Number.isSafeInteger(error.inputBytes) && error.inputBytes >= 0 ? { inputBytes: error.inputBytes } : {}),
  };
}

function quoteGitPath(bytes) {
  const escapes = new Map([[7, "\\a"], [8, "\\b"], [9, "\\t"], [10, "\\n"],
    [11, "\\v"], [12, "\\f"], [13, "\\r"], [34, '\\"'], [92, "\\\\"]]);
  let quoted = '"';
  for (const byte of bytes) {
    quoted += escapes.get(byte) ?? (byte < 32 || byte >= 127
      ? `\\${byte.toString(8).padStart(3, "0")}` : String.fromCharCode(byte));
  }
  return quoted + '"';
}

// Input is the NUL-separated output of git ls-tree for the exact diff HEAD.
// Only blobs are eligible. A tracked directory/gitlink is not source text.
export function trackedPathCatalog(output) {
  const headers = new Map();
  const hashes = new Set();
  let start = 0;
  for (let end = 0; end < output.length; end++) {
    if (output[end] !== 0) continue;
    const record = output.subarray(start, end);
    start = end + 1;
    const tab = record.indexOf(9);
    if (tab < 0) throw new GateFailure("invalid_metadata");
    const info = record.subarray(0, tab).toString("ascii");
    if (!/^\d{6} (?:blob|tree|commit) [0-9a-f]{40}$/.test(info)) throw new GateFailure("invalid_metadata");
    if (!/^(?:100644|100755|120000) blob /.test(info)) continue;
    const path = record.subarray(tab + 1);
    if (!path.length) throw new GateFailure("invalid_metadata");
    const pathHash = createHash("sha256").update(path).digest("hex");
    const prefixed = Buffer.concat([Buffer.from("b/"), path]);
    const plain = prefixed.toString("utf8");
    if (Buffer.from(plain, "utf8").equals(prefixed) && !/[\x00-\x1f\x7f"\\]/.test(plain)) {
      headers.set(plain, pathHash);
      // Git terminates an unquoted space-containing +++ path with a tab.
      if (plain.includes(" ")) headers.set(plain + "\t", pathHash);
    }
    headers.set(quoteGitPath(prefixed), pathHash);
    hashes.add(pathHash);
  }
  if (start !== output.length) throw new GateFailure("invalid_metadata");
  return { headers, hashes };
}

// The report's original-input coordinates are mapped through complete-file
// batches and Git hunk line numbers. Newline separators are not source spans.
export function highMetadata(report, batch, catalog) {
  if (!Array.isArray(report.findings)) throw new GateFailure("invalid_metadata");
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, WARN: 0 };
  const result = [];
  for (const finding of report.findings) {
    if (typeof finding?.severity !== "string" || !Object.hasOwn(counts, finding.severity)) {
      throw new GateFailure("invalid_metadata");
    }
    counts[finding.severity] += 1;
    if (finding.severity !== "HIGH") continue;
    if (!HIGH_RULE_IDS.has(finding.id) ||
        !Number.isSafeInteger(finding.line) || finding.line < 1 ||
        !Number.isSafeInteger(finding.col) || finding.col < 1) {
      throw new GateFailure("invalid_metadata");
    }
    let index = finding.line - 1;
    let source;
    for (const file of batch.files) {
      if (index >= file.lines.length) { index -= file.lines.length; continue; }
      if (!catalog.hashes.has(file.pathHash) ||
          !Number.isSafeInteger(file.sourceLines[index]) || file.sourceLines[index] < 1 ||
          finding.col > file.lines[index].length) {
        throw new GateFailure("invalid_metadata");
      }
      source = { rule: finding.id, severity: "HIGH", pathHash: file.pathHash,
        line: file.sourceLines[index], column: finding.col };
      break;
    }
    if (!source) throw new GateFailure("invalid_metadata");
    result.push(source);
  }
  for (const severity of Object.keys(counts)) {
    if (!Number.isSafeInteger(report.counts?.[severity]) || report.counts[severity] !== counts[severity]) {
      throw new GateFailure("invalid_metadata");
    }
  }
  return result;
}

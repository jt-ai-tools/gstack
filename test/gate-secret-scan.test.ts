/**
 * CI secret gate contract (R4/R9, fork port wave 2).
 *
 * .github/scripts/gate-secret-scan.mjs pipes a unified diff's ADDED lines
 * into bin/gstack-redact and enforces: HIGH fails (exit 1), MEDIUM is an
 * advisory count only (no human in CI to confirm, so it must never fail
 * the check), clean passes. The workflow-level pathspec excludes keep the
 * planted-bug fixtures out of the diff entirely; this pins the script's
 * own exit contract with live subprocess runs.
 */

import { describe, test, expect } from "bun:test";
import { spawnSync } from "child_process";
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const SCRIPT = join(ROOT, ".github", "scripts", "gate-secret-scan.mjs");
const NODE = Bun.which("node") ?? "node";

function scan(diff: string, cwd: string = ROOT, env = process.env): { code: number; out: string } {
  const res = spawnSync(NODE, [SCRIPT], {
    env,
    cwd,
    input: diff,
    encoding: "utf-8",
    timeout: 60_000,
  });
  return { code: res.status ?? -1, out: `${res.stdout}${res.stderr}` };
}

describe("gate-secret-scan.mjs exit contract", () => {
  test("clean added lines pass", () => {
    const r = scan("+const x = 1;\n+++ b/file.ts\n+// harmless\n");
    expect(r.code).toBe(0);
    expect(r.out).toContain("0 high");
  });

  // The planted PEM is assembled at runtime — header split included — so this
  // FILE never carries a live-format private key: the repo's own prepush
  // credential guard scans pushed diffs and (correctly) blocks any one-line
  // BEGIN…END spelling regardless of body. The scanner under test still
  // receives the true live shape.
  const PEM_BEGIN = ["-----BEGIN RSA ", "PRIVATE KEY-----"].join("");
  const PEM_END = ["-----END RSA ", "PRIVATE KEY-----"].join("");
  const PLANTED_PEM_BODY = ["MIIEow", "IBAAKC", "AQEA"].join("");

  test("a HIGH credential in an added line fails the gate", () => {
    const r = scan(
      `+${PEM_BEGIN}\n+${PLANTED_PEM_BODY}\n+${PEM_END}\n`,
    );
    expect(r.code).toBe(1);
    expect(r.out).toContain("1 high");
  });

  test("removed lines and context are ignored — only additions are scanned", () => {
    const r = scan(
      `-${PEM_BEGIN}\n-${PLANTED_PEM_BODY}\n${PEM_END}\n+just an addition\n`,
    );
    expect(r.code).toBe(0);
  });

  test("MEDIUM findings are advisory only — never fail CI", () => {
    // A Stripe publishable-key shape sits at MEDIUM in the taxonomy
    // (context-variable; a human confirms interactively, CI cannot).
    const r = scan(`+const key = "pk_live_${"a".repeat(24)}";\n`);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/\d+ advisory/);
  });
});

describe("gate-secret-scan.mjs fail-closed legs", () => {
  test("one oversize file still fails closed", () => {
    // No file boundary permits safe batching here. Never split or truncate
    // this file to fit the scanner; ~17 MB must remain a fail-closed refusal.
    const line = `+${"a".repeat(8190)}\n`;
    const r = scan(line.repeat(2100));
    expect(r.code).toBe(1);
    expect(r.out).toContain("1 high");
    expect(r.out).toContain("one file's added text exceeds");
    expect(r.out).toContain("fail-closed");
  }, 60_000);

  test("unexpected gstack-redact exit code fails the gate even when the report is clean", () => {
    // Stub bin/gstack-redact that emits a CLEAN JSON report but exits 1 —
    // not one of the contract codes (0 clean / 2 MEDIUM / 3 HIGH). The gate
    // must treat the unexpected exit as failure: a broken scanner reporting
    // "all clear" is exactly the fail-open shape this leg guards against.
    const dir = mkdtempSync(join(tmpdir(), "gate-secret-scan-stub-"));
    try {
      mkdirSync(join(dir, "bin"));
      writeFileSync(
        join(dir, "bin", "gstack-redact"),
        [
          "#!/usr/bin/env bun",
          'let input = "";',
          'process.stdin.setEncoding("utf8");',
          'process.stdin.on("data", (c) => { input += c; });',
          'process.stdin.on("end", () => {',
          '  console.log(JSON.stringify({ findings: [], counts: { HIGH: 0, MEDIUM: 0, LOW: 0, WARN: 0 }, repoVisibility: "public", oversize: false }));',
          "  process.exit(1);",
          "});",
          "",
        ].join("\n"),
      );
      const r = scan("+const x = 1;\n", dir);
      expect(r.out).toContain("0 high"); // the clean report WAS parsed...
      expect(r.code).toBe(1); // ...and the gate still failed on the exit code
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("missing gstack-redact (spawn crash, empty stdout) exits nonzero — never fail-open", () => {
    // cwd with no bin/gstack-redact at all: bun exits module-not-found with
    // empty stdout. Whatever the exact failure shape, the gate must not
    // report success.
    const dir = mkdtempSync(join(tmpdir(), "gate-secret-scan-absent-"));
    try {
      const r = scan("+const x = 1;\n", dir);
      expect(r.code).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});


function fileDiff(name: string, additions: string): string {
  return `diff --git a/${name} b/${name}\n--- a/${name}\n+++ b/${name}\n@@ -0,0 +1,${additions.split("\n").length} @@\n` +
    additions.split("\n").map((line) => `+${line}\n`).join("");
}

function withScannerStub(body: string, check: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "gate-secret-batches-"));
  try {
    mkdirSync(join(dir, "bin"));
    writeFileSync(join(dir, "bin", "gstack-redact"), [
      'import { appendFileSync } from "fs";',
      'import { createHash } from "crypto";',
      'let input = "";',
      'process.stdin.setEncoding("utf8");',
      'process.stdin.on("data", (chunk) => { input += chunk; });',
      'process.stdin.on("end", () => {',
      '  const bytes = Buffer.byteLength(input, "utf8");',
      '  const hash = createHash("sha256").update(input).digest("hex");',
      '  appendFileSync("scans.jsonl", JSON.stringify({ bytes, hash }) + "\\n");',
      '  if (bytes > 16000000) process.exit(1);',
      body,
      '});',
    ].join("\n"));
    check(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const CLEAN_REPORT = 'console.log(JSON.stringify({ counts: { HIGH: 0, MEDIUM: 0 }, oversize: false }));';
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const receipts = (dir: string): Array<{ bytes: number; hash: string }> =>
  readFileSync(join(dir, "scans.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));

describe("gate-secret-scan.mjs whole-file batching", () => {
  test("a clean aggregate above the CLI cap scans every byte in bounded batches", () => {
    // Exactly 16,000,000 bytes including the joining newline, then a third
    // file. Distinct text and hashes prove complete, ordered coverage.
    const first = "a".repeat(8_000_000);
    const second = "b".repeat(7_999_999);
    const third = "c".repeat(1_000_000);
    withScannerStub(CLEAN_REPORT, (dir) => {
      const r = scan(fileDiff("a.txt", first) + fileDiff("b.txt", second) + fileDiff("c.txt", third), dir);
      expect(r.code).toBe(0);
      expect(r.out).toContain("2 batches, 17000000 input bytes");
      expect(receipts(dir)).toEqual([
        { bytes: 16_000_000, hash: hash(`${first}\n${second}`) },
        { bytes: third.length, hash: hash(third) },
      ]);
    });
  }, 60_000);

  test("a HIGH in a later batch blocks, and the following batch is still scanned", () => {
    const first = "a".repeat(8_000_001);
    const second = "z".repeat(8_000_001) + "\ncredential-sentinel";
    const third = "c".repeat(8_000_001);
    withScannerStub([
      'const high = input.includes("credential-sentinel") ? 1 : 0;',
      'console.log(JSON.stringify({ counts: { HIGH: high, MEDIUM: 0 }, oversize: false }));',
      'process.exitCode = high ? 3 : 0;',
    ].join("\n"), (dir) => {
      const r = scan(fileDiff("a.txt", first) + fileDiff("b.txt", second) + fileDiff("c.txt", third), dir);
      expect(r.code).toBe(1);
      expect(r.out).toContain("1 high");
      expect(receipts(dir).map((r) => r.hash)).toEqual([hash(first), hash(second), hash(third)]);
    });
  }, 60_000);

  test("a file moves intact across a batch boundary, including multiline context", () => {
    const first = "a".repeat(15_999_990);
    const multiline = '"private_key_id": "fixture"\n"private_key"\n : "' +
      ["-----BEGIN ", "PRIVATE KEY-----"].join("");
    withScannerStub(CLEAN_REPORT, (dir) => {
      expect(scan(fileDiff("large.txt", first) + fileDiff("key.json", multiline), dir).code).toBe(0);
      expect(receipts(dir)).toEqual([
        { bytes: first.length, hash: hash(first) },
        { bytes: Buffer.byteLength(multiline), hash: hash(multiline) },
      ]);
    });
    // The real shared scanner must still see the multiline GCP shape.
    expect(scan(fileDiff("key.json", multiline)).code).toBe(1);
    // AWS requires context on a different line; the token alone is not HIGH.
    const token = ["Ab9Cd8Ef7Gh6Ij5Kl4Mn", "3Op2Qr1St0UvWxYzABCD"].join("");
    expect(scan(fileDiff("aws.txt", token)).code).toBe(0);
    expect(scan(fileDiff("aws.txt", `aws_secret_access_key\n${token}`)).code).toBe(1);
  }, 60_000);

  test("byte accounting counts UTF-8, not JavaScript code units", () => {
    const oversized = "界".repeat(5_333_334);
    const r = scan(fileDiff("unicode.txt", oversized));
    expect(r.code).toBe(1);
    expect(r.out).toContain("16000002");
    expect(r.out).toContain("fail-closed");
  }, 60_000);

  test("added +++ lines in a real hunk are scanned", () => {
    const pem = ["-----BEGIN RSA ", "PRIVATE KEY-----"].join("");
    expect(scan(fileDiff("key.txt", `++${pem}`)).code).toBe(1);
  });

  test("multiple hunks of the same file stay together and CRLF is normalized", () => {
    const diff = "diff --git a/a.txt b/a.txt\r\n--- a/a.txt\r\n+++ b/a.txt\r\n" +
      "@@ -1 +1 @@\r\n-old\r\n+first\r\n" +
      "@@ -9 +9 @@\r\n-older\r\n+second\r\n\\ No newline at end of file\r\n";
    withScannerStub(CLEAN_REPORT, (dir) => {
      expect(scan(diff, dir).code).toBe(0);
      expect(receipts(dir)).toEqual([{ bytes: 12, hash: hash("first\nsecond") }]);
    });
  });

  test("MEDIUM advisory counts aggregate across batches without failing", () => {
    withScannerStub(CLEAN_REPORT.replace("MEDIUM: 0", "MEDIUM: 2") + "\nprocess.exitCode = 2;", (dir) => {
      const file = "a".repeat(8_000_001);
      const r = scan(fileDiff("a.txt", file) + fileDiff("b.txt", file), dir);
      expect(r.code).toBe(0);
      expect(r.out).toContain("4 advisory");
      expect(receipts(dir)).toHaveLength(2);
    });
  }, 60_000);
});

describe("gate-secret-scan.mjs scanner result validation", () => {
  for (const [name, body] of [
    ["missing counts", 'console.log(JSON.stringify({ oversize: false }));'],
    ["negative counts", CLEAN_REPORT.replace("HIGH: 0", "HIGH: -1")],
    ["string counts", CLEAN_REPORT.replace("HIGH: 0", 'HIGH: "0"')],
    ["oversize flag", CLEAN_REPORT.replace("oversize: false", "oversize: true")],
    ["inconsistent HIGH exit", CLEAN_REPORT + "\nprocess.exitCode = 3;"],
    ["inconsistent MEDIUM exit", CLEAN_REPORT + "\nprocess.exitCode = 2;"],
    ["truncated report", 'console.log("{");'],
    ["early exit without report", ''],
  ]) {
    test(`${name} fails closed`, () => {
      withScannerStub(body, (dir) => {
        expect(scan(fileDiff("a.txt", "clean"), dir).code).toBe(1);
      });
    });
  }
});


describe("gate-secret-scan.mjs transport failures", () => {
  test("an early clean report cannot hide an incomplete stdin write", () => {
    withScannerStub(CLEAN_REPORT, (dir) => {
      // This scanner deliberately closes its input before consuming any of a
      // multi-MB payload, then claims success. A valid report must not turn
      // the resulting EPIPE into a successful, partially scanned gate.
      writeFileSync(join(dir, "bin", "gstack-redact"), [
        'import { closeSync } from "fs";',
        'closeSync(0);',
        CLEAN_REPORT,
      ].join("\n"));
      const r = scan(fileDiff("a.txt", "a".repeat(8_000_001)), dir);
      expect(r.code).toBe(1);
      expect(r.out).toContain("fail-closed");
    });
  }, 60_000);

  test("an unavailable bun executable fails closed", () => {
    const dir = mkdtempSync(join(tmpdir(), "gate-secret-no-bun-"));
    try {
      const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"));
      env.PATH = dir;
      const r = scan(fileDiff("a.txt", "clean"), ROOT, env);
      expect(r.code).toBe(1);
      expect(r.out).toContain("fail-closed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.skipIf(process.platform === "win32")("a failed diff input read fails closed", () => {
    // A directory can be opened on Unix, but stdin read must fail with EISDIR.
    const dir = mkdtempSync(join(tmpdir(), "gate-secret-read-error-"));
    const fd = openSync(dir, "r");
    try {
      const r = spawnSync(NODE, [SCRIPT], {
        cwd: ROOT,
        stdio: [fd, "pipe", "pipe"],
        encoding: "utf8",
        timeout: 60_000,
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("input error");
      expect(r.stderr).toContain("fail-closed");
    } finally {
      closeSync(fd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

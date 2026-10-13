import { expect } from 'bun:test';

/** Pin the full owner conjunction; the original predicate keeps its status/event semantics. */
export function expectUpstreamOnly(actual: unknown, original = ''): void {
  const inner = original.trim().replace(/^\$\{\{\s*/, '').replace(/\s*\}\}$/, '');
  const prefix = "github.repository == 'garrytan/gstack'";
  const expected = inner ? `\${{ ${prefix} && (${inner}) }}` : `\${{ ${prefix} }}`;
  expect(actual).toBe(expected);
  // Exact equality above rules out any event/manual OR escape. Treat the retained
  // original expression as a boolean input, covering both outcomes without eval().
  const owner = String(actual).match(/^\$\{\{ github\.repository == '([^']+)'/)?.[1];
  for (const event of ['pull_request', 'workflow_dispatch', 'schedule']) {
    for (const originalAllows of [false, true]) {
      for (const repository of ['garrytan/gstack', 'jt-ai-tools/gstack', '', 'someone/gstack']) {
        const allowed = repository === owner && originalAllows;
        expect(allowed, `${event}: ${repository || '(missing)'}; original=${originalAllows}`)
          .toBe(repository === 'garrytan/gstack' && originalAllows);
      }
    }
  }
}

/** Fork main still performs the same read-only check, never the publication path. */
export function expectForkReadOnlyFallback(actual: unknown): void {
  expect(actual).toBe("github.repository != 'garrytan/gstack' || github.ref != 'refs/heads/main'");
  const owner = String(actual).match(/^github\.repository != '([^']+)'/)?.[1];
  const main = String(actual).match(/github\.ref != '([^']+)'$/)?.[1];
  for (const event of ['workflow_dispatch', 'schedule']) {
    for (const [repository, ref, expected] of [
      ['garrytan/gstack', 'refs/heads/main', false],
      ['garrytan/gstack', 'refs/heads/topic', true],
      ['jt-ai-tools/gstack', 'refs/heads/main', true],
      ['jt-ai-tools/gstack', 'refs/heads/topic', true],
      ['', 'refs/heads/main', true],
    ] as const) {
      expect(repository !== owner || ref !== main, `${event}: ${repository}; ${ref}`).toBe(expected);
    }
  }
}

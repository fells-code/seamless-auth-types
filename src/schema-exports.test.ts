import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const SRC_DIR = fileURLToPath(new URL('.', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

/**
 * Declarations wrap across lines, so every pattern here runs against the file
 * with its whitespace collapsed rather than line by line.
 */
function flatten(source: string) {
  return source.replace(/\s+/g, ' ');
}

describe('schema exports', () => {
  const sources = sourceFiles(SRC_DIR).map((path) => ({
    path,
    flat: flatten(readFileSync(path, 'utf8')),
  }));

  it('has sources to check', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('exports a type alias for every exported schema', () => {
    const aliased = new Set(
      sources.flatMap(({ flat }) =>
        [...flat.matchAll(/export type \w+ = z\.infer< ?typeof (\w+) ?>/g)].map(
          (match) => match[1],
        ),
      ),
    );

    const missing = sources.flatMap(({ path, flat }) =>
      [...flat.matchAll(/export const (\w+Schema)\b/g)]
        .map((match) => match[1])
        .filter((name) => !aliased.has(name))
        .map((name) => `${name} (${path})`),
    );

    expect(missing).toEqual([]);
  });
});

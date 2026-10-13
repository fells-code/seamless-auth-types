// Type-checks a consumer of the packed build against the lowest zod our range
// allows. The emitted declarations reference zod's own types (for example the
// two-argument ZodPreprocess), so a floor below the zod we build with lets
// consumers install a zod whose types reject our .d.ts files (#95).
//
// Run after `npm run build`. Needs network access to install zod.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const range = pkg.dependencies?.zod ?? pkg.peerDependencies?.zod;
const floor = /^\^?(\d+\.\d+\.\d+)$/.exec(range ?? '')?.[1];
if (!floor) {
  throw new Error(`Expected a caret or exact zod range in package.json, found "${range}"`);
}

const tsc = createRequire(join(root, 'package.json')).resolve('typescript/bin/tsc');
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

const work = mkdtempSync(join(tmpdir(), 'seamless-auth-types-zod-floor-'));
let failed = false;
try {
  // Find the tarball on disk rather than parsing stdout: npm 10 still runs the
  // prepare script during pack despite --ignore-scripts, and its output lands there.
  run('npm', ['pack', '--ignore-scripts', '--silent', '--pack-destination', work], root);
  const tarball = readdirSync(work).find((name) => name.endsWith('.tgz'));
  if (!tarball) throw new Error(`npm pack wrote no tarball to ${work}`);

  const consumer = join(work, 'consumer');
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'zod-floor-consumer', private: true, type: 'module' }),
  );
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--save-exact',
      join(work, tarball),
      `zod@${floor}`,
    ],
    consumer,
  );

  const installed = JSON.parse(
    readFileSync(join(consumer, 'node_modules/zod/package.json'), 'utf8'),
  ).version;
  if (installed !== floor) {
    throw new Error(`Expected zod ${floor} in the consumer, npm installed ${installed}`);
  }

  writeFileSync(
    join(consumer, 'index.ts'),
    [
      "import * as types from '@seamless-auth/types';",
      "import * as role from '@seamless-auth/types/role';",
      "import * as matching from '@seamless-auth/types/role/matching';",
      "import type { z } from 'zod';",
      'export const all = { types, role, matching };',
      'export type RegisterStartQuery = z.infer<typeof types.WebAuthnRegisterStartQuerySchema>;',
      '',
    ].join('\n'),
  );

  for (const moduleResolution of ['bundler', 'NodeNext']) {
    const config = `tsconfig.${moduleResolution}.json`;
    writeFileSync(
      join(consumer, config),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          skipLibCheck: false,
          noEmit: true,
          target: 'ES2022',
          module: moduleResolution === 'bundler' ? 'ESNext' : 'NodeNext',
          moduleResolution,
          types: [],
        },
        files: ['index.ts'],
      }),
    );
    try {
      run(process.execPath, [tsc, '-p', config], consumer);
      console.log(`zod ${floor}, moduleResolution ${moduleResolution}: ok`);
    } catch (error) {
      failed = true;
      console.error(`zod ${floor}, moduleResolution ${moduleResolution}: failed`);
      console.error(error.stdout);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failed) {
  console.error(
    `The built declarations do not type-check against zod ${floor}. Raise the zod floor in package.json.`,
  );
  process.exit(1);
}

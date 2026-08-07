import fs from 'node:fs';
import path from 'node:path';

/**
 * This project carries two lockfiles because two package managers install it:
 * pnpm locally and in the Dockerfile, npm on the production host, which runs
 * `npm ci`. `npm ci` refuses to install at all when package.json and
 * package-lock.json disagree — it does not fall back, it exits.
 *
 * That has now broken a deploy twice, both times the same way: a dependency was
 * added with `pnpm add`, which updates package.json and pnpm-lock.yaml and has
 * no reason to touch package-lock.json. Nothing local fails, because nothing
 * local uses that file. The first sign is the production build dying on
 * "Missing: <pkg> from lock file", followed by "Could not find a production
 * build" as the whole chain unwinds.
 *
 * So the check lives here, where it runs on every `pnpm test`.
 */
const APP_ROOT = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8'));
const lock = JSON.parse(
  fs.readFileSync(path.join(APP_ROOT, 'package-lock.json'), 'utf8'),
);

const FIX = 'Run `npm install --package-lock-only` in app/ and commit package-lock.json.';

describe('package-lock.json tracks package.json', () => {
  const declared = Object.keys({
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  });

  it.each(declared)('%s is present in the npm lockfile', (name) => {
    const present =
      `node_modules/${name}` in lock.packages ||
      Object.keys(lock.packages).some((key) => key.endsWith(`node_modules/${name}`));
    if (!present) throw new Error(`"${name}" is missing from package-lock.json. ${FIX}`);
  });

  it('records the same version range the manifest asks for', () => {
    const root = lock.packages['']?.dependencies ?? {};
    const rootDev = lock.packages['']?.devDependencies ?? {};
    const drift = Object.entries(pkg.dependencies ?? {}).filter(
      ([name, range]) => root[name] !== range && rootDev[name] !== range,
    );
    if (drift.length) {
      throw new Error(
        `package-lock.json has stale ranges for: ${drift
          .map(([n, r]) => `${n}@${r}`)
          .join(', ')}. ${FIX}`,
      );
    }
  });
});

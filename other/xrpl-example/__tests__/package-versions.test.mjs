/**
 * Tests for package version constraints in xrpl-example.
 *
 * This PR downgraded the xrpl package from ^3.0.0 to ^2.7.0 to reduce
 * vulnerabilities. These tests verify the version ranges and lockfile
 * resolutions are correct after the change.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const lockfile = JSON.parse(readFileSync(join(projectRoot, 'package-lock.json'), 'utf8'));

/**
 * Parse a semver range of the form "^X.Y.Z" or "~X.Y.Z" and return the major version number.
 */
function parseMajorFromRange(range) {
  const match = range.replace(/^[\^~>=<]/, '').match(/^(\d+)/);
  if (!match) throw new Error(`Cannot parse major from range: ${range}`);
  return parseInt(match[1], 10);
}

/**
 * Parse the major version from a resolved version string like "2.14.1".
 */
function parseMajor(version) {
  const match = version.match(/^(\d+)/);
  if (!match) throw new Error(`Cannot parse major from version: ${version}`);
  return parseInt(match[1], 10);
}

/**
 * Check if a version string satisfies a "^X.Y.Z" caret range:
 * - Same major version
 * - version >= range minimum
 */
function satisfiesCaretRange(version, range) {
  const cleanRange = range.replace(/^\^/, '');
  const [rMajor, rMinor, rPatch] = cleanRange.split('.').map(Number);
  const [vMajor, vMinor, vPatch] = version.split('.').map(Number);

  if (vMajor !== rMajor) return false;
  if (vMinor < rMinor) return false;
  if (vMinor === rMinor && vPatch < rPatch) return false;
  return true;
}

describe('xrpl-example package.json version constraints', () => {
  test('xrpl declared version range uses major version 2 (not 3)', () => {
    const xrplRange = pkg.dependencies.xrpl;
    assert.ok(xrplRange, 'xrpl should be listed as a dependency');

    const major = parseMajorFromRange(xrplRange);
    assert.strictEqual(major, 2, `xrpl version range "${xrplRange}" should have major version 2, got ${major}`);
  });

  test('xrpl declared version range is at least ^2.7.0', () => {
    const xrplRange = pkg.dependencies.xrpl;
    assert.ok(xrplRange, 'xrpl should be listed as a dependency');
    assert.match(xrplRange, /^\^2\.([7-9]|\d{2,})\.\d+$|^\^2\.[7-9]\d*\.\d+$/, `xrpl range "${xrplRange}" should be ^2.7.0 or higher within v2`);
  });

  test('xrpl is NOT declared as a version 3.x dependency', () => {
    const xrplRange = pkg.dependencies.xrpl;
    const major = parseMajorFromRange(xrplRange);
    assert.notStrictEqual(major, 3, `xrpl version range "${xrplRange}" must NOT be major version 3`);
  });

  test('xrpl range uses caret (^) semver specifier', () => {
    const xrplRange = pkg.dependencies.xrpl;
    assert.match(xrplRange, /^\^/, `xrpl version range "${xrplRange}" should use caret (^) specifier`);
  });

  test('package.json has all required core dependencies', () => {
    const requiredDeps = ['@web3auth/modal', 'react', 'react-dom', 'xrpl'];
    for (const dep of requiredDeps) {
      assert.ok(pkg.dependencies[dep], `Missing required dependency: ${dep}`);
    }
  });
});

describe('xrpl-example package-lock.json resolved versions', () => {
  test('lockfile resolves xrpl to a version 2.x.x release', () => {
    const xrplLock = lockfile.packages?.['node_modules/xrpl'];
    assert.ok(xrplLock, 'xrpl should be present in package-lock.json node_modules');
    assert.ok(xrplLock.version, 'xrpl lock entry should have a version field');

    const major = parseMajor(xrplLock.version);
    assert.strictEqual(major, 2, `Lockfile resolved xrpl to "${xrplLock.version}", expected major version 2`);
  });

  test('lockfile does NOT resolve xrpl to a version 3.x.x release', () => {
    const xrplLock = lockfile.packages?.['node_modules/xrpl'];
    assert.ok(xrplLock, 'xrpl should be present in package-lock.json');
    const major = parseMajor(xrplLock.version);
    assert.notStrictEqual(major, 3, `Lockfile should NOT resolve xrpl to a v3 release (got ${xrplLock.version})`);
  });

  test('lockfile resolved xrpl version satisfies the declared ^2.7.0 caret range', () => {
    const xrplRange = pkg.dependencies.xrpl;
    const xrplLock = lockfile.packages?.['node_modules/xrpl'];
    assert.ok(xrplLock, 'xrpl should be present in package-lock.json');

    const resolvedVersion = xrplLock.version;
    const satisfied = satisfiesCaretRange(resolvedVersion, xrplRange);
    assert.ok(
      satisfied,
      `Resolved xrpl version "${resolvedVersion}" should satisfy declared range "${xrplRange}"`
    );
  });

  test('lockfile xrpl resolved version is at least 2.7.0', () => {
    const xrplLock = lockfile.packages?.['node_modules/xrpl'];
    assert.ok(xrplLock, 'xrpl should be present in package-lock.json');

    const [major, minor, patch] = xrplLock.version.split('.').map(Number);
    const atLeast270 = major > 2 || (major === 2 && minor > 7) || (major === 2 && minor === 7 && patch >= 0);
    assert.ok(atLeast270, `xrpl version "${xrplLock.version}" should be >= 2.7.0`);
  });

  test('lockfile xrpl entry has a resolved registry URL', () => {
    const xrplLock = lockfile.packages?.['node_modules/xrpl'];
    assert.ok(xrplLock, 'xrpl should be present in package-lock.json');
    assert.ok(xrplLock.resolved, 'xrpl lock entry should have a resolved URL');
    assert.match(xrplLock.resolved, /^https:\/\/registry\.npmjs\.org\/xrpl\//, 'xrpl should resolve from the npm registry');
  });

  test('lockfile xrpl entry has an integrity hash', () => {
    const xrplLock = lockfile.packages?.['node_modules/xrpl'];
    assert.ok(xrplLock, 'xrpl should be present in package-lock.json');
    assert.ok(xrplLock.integrity, 'xrpl lock entry should have an integrity (SRI) hash');
    assert.match(xrplLock.integrity, /^sha512-/, 'integrity hash should use sha512');
  });

  test('lockfile format version is 3 (npm v7+)', () => {
    assert.strictEqual(lockfile.lockfileVersion, 3, 'package-lock.json should use lockfile version 3');
  });

  test('lockfile name matches package name', () => {
    assert.strictEqual(lockfile.name, 'xrpl-example', 'lockfile name should match package name');
  });

  // Regression test: ensure we did not accidentally include a nested xrpl v3.x dependency
  test('regression: no node_modules sub-path resolves xrpl to version 3.x', () => {
    const xrplEntries = Object.entries(lockfile.packages || {})
      .filter(([key]) => key === 'node_modules/xrpl' || key.endsWith('/node_modules/xrpl'));

    for (const [path, entry] of xrplEntries) {
      const major = parseMajor(entry.version);
      assert.notStrictEqual(
        major,
        3,
        `Found a nested xrpl v3 resolution at path "${path}" (version: ${entry.version}). All xrpl resolutions should be v2.`
      );
    }
  });
});

describe('xrpl-example lockfile - key dependency resolutions after xrpl downgrade', () => {
  test('ripple-binary-codec resolves to version 1.x (compatible with xrpl v2)', () => {
    // xrpl v2 uses ripple-binary-codec v1, while xrpl v3 uses v2+
    const entry = lockfile.packages?.['node_modules/ripple-binary-codec'];
    if (entry) {
      const major = parseMajor(entry.version);
      assert.strictEqual(major, 1, `ripple-binary-codec should be v1.x with xrpl v2, got: ${entry.version}`);
    }
  });

  test('lodash is present as a transitive dependency (required by xrpl v2)', () => {
    // xrpl v2 depends on lodash; xrpl v3 removed this dependency
    const entry = lockfile.packages?.['node_modules/lodash'];
    assert.ok(entry, 'lodash should be present as a transitive dependency when using xrpl v2');
  });

  test('lodash resolves to version 4.x', () => {
    const entry = lockfile.packages?.['node_modules/lodash'];
    if (entry) {
      const major = parseMajor(entry.version);
      assert.strictEqual(major, 4, `lodash should be v4.x, got: ${entry.version}`);
    }
  });
});
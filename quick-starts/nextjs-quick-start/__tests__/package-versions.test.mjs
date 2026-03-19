/**
 * Tests for package version constraints in nextjs-quick-start.
 *
 * This PR downgraded the wagmi package from ^3.0.0 to ^2.14.16 to reduce
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
 * Parse the major version number from a semver range like "^2.14.16" or "~2.0.0".
 */
function parseMajorFromRange(range) {
  const match = range.replace(/^[\^~>=<]/, '').match(/^(\d+)/);
  if (!match) throw new Error(`Cannot parse major from range: ${range}`);
  return parseInt(match[1], 10);
}

/**
 * Parse the major version number from a resolved version string like "2.14.16".
 */
function parseMajor(version) {
  const match = version.match(/^(\d+)/);
  if (!match) throw new Error(`Cannot parse major from version: ${version}`);
  return parseInt(match[1], 10);
}

/**
 * Determine if a resolved version satisfies a caret (^) range.
 * Caret: same major, and resolved >= minimum.
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

describe('nextjs-quick-start package.json version constraints', () => {
  test('wagmi declared version range uses major version 2 (not 3)', () => {
    const wagmiRange = pkg.dependencies.wagmi;
    assert.ok(wagmiRange, 'wagmi should be listed as a dependency');

    const major = parseMajorFromRange(wagmiRange);
    assert.strictEqual(major, 2, `wagmi version range "${wagmiRange}" should have major version 2, got ${major}`);
  });

  test('wagmi declared version range is at least ^2.14.16', () => {
    const wagmiRange = pkg.dependencies.wagmi;
    assert.ok(wagmiRange, 'wagmi should be listed as a dependency');
    // Range should be ^2.14.x or higher within v2
    const [, minor] = wagmiRange.replace(/^\^/, '').split('.').map(Number);
    assert.ok(minor >= 14, `wagmi minor version in range "${wagmiRange}" should be >= 14`);
  });

  test('wagmi is NOT declared as a version 3.x dependency', () => {
    const wagmiRange = pkg.dependencies.wagmi;
    const major = parseMajorFromRange(wagmiRange);
    assert.notStrictEqual(major, 3, `wagmi version range "${wagmiRange}" must NOT be major version 3`);
  });

  test('wagmi range uses caret (^) semver specifier', () => {
    const wagmiRange = pkg.dependencies.wagmi;
    assert.match(wagmiRange, /^\^/, `wagmi version range "${wagmiRange}" should use caret (^) specifier`);
  });

  test('package.json has all required core dependencies', () => {
    const requiredDeps = ['@tanstack/react-query', '@web3auth/modal', 'next', 'react', 'react-dom', 'wagmi'];
    for (const dep of requiredDeps) {
      assert.ok(pkg.dependencies[dep], `Missing required dependency: ${dep}`);
    }
  });

  test('package.json name is nextjs-quick-start', () => {
    assert.strictEqual(pkg.name, 'nextjs-quick-start');
  });
});

describe('nextjs-quick-start package-lock.json resolved versions', () => {
  test('lockfile resolves wagmi to a version 2.x.x release', () => {
    const wagmiLock = lockfile.packages?.['node_modules/wagmi'];
    assert.ok(wagmiLock, 'wagmi should be present in package-lock.json node_modules');
    assert.ok(wagmiLock.version, 'wagmi lock entry should have a version field');

    const major = parseMajor(wagmiLock.version);
    assert.strictEqual(major, 2, `Lockfile resolved wagmi to "${wagmiLock.version}", expected major version 2`);
  });

  test('lockfile does NOT resolve wagmi to a version 3.x.x release', () => {
    const wagmiLock = lockfile.packages?.['node_modules/wagmi'];
    assert.ok(wagmiLock, 'wagmi should be present in package-lock.json');
    const major = parseMajor(wagmiLock.version);
    assert.notStrictEqual(major, 3, `Lockfile should NOT resolve wagmi to a v3 release (got ${wagmiLock.version})`);
  });

  test('lockfile resolved wagmi version satisfies the declared ^2.14.16 caret range', () => {
    const wagmiRange = pkg.dependencies.wagmi;
    const wagmiLock = lockfile.packages?.['node_modules/wagmi'];
    assert.ok(wagmiLock, 'wagmi should be present in package-lock.json');

    const resolvedVersion = wagmiLock.version;
    const satisfied = satisfiesCaretRange(resolvedVersion, wagmiRange);
    assert.ok(
      satisfied,
      `Resolved wagmi version "${resolvedVersion}" should satisfy declared range "${wagmiRange}"`
    );
  });

  test('lockfile wagmi resolved version is exactly 2.14.16 or higher within v2', () => {
    const wagmiLock = lockfile.packages?.['node_modules/wagmi'];
    assert.ok(wagmiLock, 'wagmi should be present in package-lock.json');

    const [major, minor, patch] = wagmiLock.version.split('.').map(Number);
    const atLeast21416 =
      major > 2 ||
      (major === 2 && minor > 14) ||
      (major === 2 && minor === 14 && patch >= 16);
    assert.ok(atLeast21416, `wagmi version "${wagmiLock.version}" should be >= 2.14.16`);
  });

  test('lockfile wagmi entry has a resolved registry URL', () => {
    const wagmiLock = lockfile.packages?.['node_modules/wagmi'];
    assert.ok(wagmiLock, 'wagmi should be present in package-lock.json');
    assert.ok(wagmiLock.resolved, 'wagmi lock entry should have a resolved URL');
    assert.match(wagmiLock.resolved, /^https:\/\/registry\.npmjs\.org\/wagmi\//, 'wagmi should resolve from the npm registry');
  });

  test('lockfile wagmi entry has an integrity hash', () => {
    const wagmiLock = lockfile.packages?.['node_modules/wagmi'];
    assert.ok(wagmiLock, 'wagmi should be present in package-lock.json');
    assert.ok(wagmiLock.integrity, 'wagmi lock entry should have an integrity (SRI) hash');
    assert.match(wagmiLock.integrity, /^sha512-/, 'integrity hash should use sha512');
  });

  test('lockfile format version is 3 (npm v7+)', () => {
    assert.strictEqual(lockfile.lockfileVersion, 3, 'package-lock.json should use lockfile version 3');
  });

  test('lockfile name matches package name', () => {
    assert.strictEqual(lockfile.name, 'nextjs-quick-start', 'lockfile name should match package name');
  });

  // Regression test: ensure no nested wagmi v3.x dependency snuck in
  test('regression: no node_modules sub-path resolves wagmi to version 3.x', () => {
    const wagmiEntries = Object.entries(lockfile.packages || {})
      .filter(([key]) => key === 'node_modules/wagmi' || key.endsWith('/node_modules/wagmi'));

    for (const [path, entry] of wagmiEntries) {
      const major = parseMajor(entry.version);
      assert.notStrictEqual(
        major,
        3,
        `Found a nested wagmi v3 resolution at path "${path}" (version: ${entry.version}). All wagmi resolutions should be v2.`
      );
    }
  });
});

describe('nextjs-quick-start lockfile - key dependency resolutions after wagmi downgrade', () => {
  test('@wagmi/core resolves to version 2.x (compatible with wagmi v2)', () => {
    const entry = lockfile.packages?.['node_modules/@wagmi/core'];
    assert.ok(entry, '@wagmi/core should be present in the lockfile');
    const major = parseMajor(entry.version);
    assert.strictEqual(major, 2, `@wagmi/core should be v2.x with wagmi v2, got: ${entry.version}`);
  });

  test('@wagmi/connectors is present and resolves to a valid version', () => {
    const entry = lockfile.packages?.['node_modules/@wagmi/connectors'];
    assert.ok(entry, '@wagmi/connectors should be present in the lockfile');
    assert.ok(entry.version, '@wagmi/connectors should have a version field');
    // connectors major version is independent, just ensure it exists and has a valid version string
    assert.match(entry.version, /^\d+\.\d+\.\d+/, '@wagmi/connectors version should be a valid semver string');
  });

  test('@coinbase/wallet-sdk resolves to version 4.x (required by wagmi v2 connectors)', () => {
    const entry = lockfile.packages?.['node_modules/@coinbase/wallet-sdk'];
    assert.ok(entry, '@coinbase/wallet-sdk should be present in the lockfile');
    const major = parseMajor(entry.version);
    assert.strictEqual(major, 4, `@coinbase/wallet-sdk should be v4.x, got: ${entry.version}`);
  });

  test('wagmi dependencies include @wagmi/connectors and @wagmi/core', () => {
    const wagmiLock = lockfile.packages?.['node_modules/wagmi'];
    assert.ok(wagmiLock, 'wagmi should be present in the lockfile');
    assert.ok(wagmiLock.dependencies?.['@wagmi/connectors'], 'wagmi should depend on @wagmi/connectors');
    assert.ok(wagmiLock.dependencies?.['@wagmi/core'], 'wagmi should depend on @wagmi/core');
  });
});
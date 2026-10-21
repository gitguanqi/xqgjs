#!/usr/bin/env node
/**
 * Asserts what `npm publish` would actually upload.
 *
 * The package used to ship `test/` and had no `files` whitelist, so the tarball content was
 * whatever happened to be on disk. This check pins the published surface.
 */

'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const ALLOWED_PREFIXES = ['lib/', 'README.md', 'zh.md', 'CHANGELOG.md', 'LICENSE', 'package.json'];
const FORBIDDEN_PATTERNS = [/^test\//, /^scripts\//, /^\.git\//, /^node_modules\//, /\.test\.js$/];

function run() {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(npm, ['pack', '--dry-run', '--json'], {
        cwd: ROOT,
        encoding: 'utf8',
        shell: process.platform === 'win32'
    });

    if (result.error) {
        console.error('check-pack: could not run npm pack: ' + result.error.message);
        process.exit(1);
    }
    if (result.status !== 0) {
        console.error('check-pack: npm pack failed');
        console.error(result.stderr || result.stdout);
        process.exit(1);
    }

    let parsed;
    try {
        parsed = JSON.parse(result.stdout);
    } catch (error) {
        console.error('check-pack: npm pack did not emit JSON');
        console.error(result.stdout);
        process.exit(1);
    }

    const files = (parsed[0] && parsed[0].files) || [];
    const names = files.map((entry) => entry.path);
    const problems = [];

    for (const name of names) {
        if (FORBIDDEN_PATTERNS.some((re) => re.test(name))) {
            problems.push('published archive contains ' + name);
        }
    }

    const required = [
        'lib/xqgjs.js',
        'lib/xqgjs.min.js',
        'lib/xqgjs-esm.js',
        'lib/xqgjs-esm.min.js',
        'lib/xqgjs.d.ts',
        'lib/xqgjs-esm.d.mts'
    ];
    for (const name of required) {
        if (!names.includes(name)) problems.push('missing from archive: ' + name);
    }

    const unexpected = names.filter((name) => !ALLOWED_PREFIXES.some((prefix) =>
        prefix.endsWith('/') ? name.startsWith(prefix) : name === prefix));
    if (unexpected.length) {
        problems.push('unexpected entries: ' + unexpected.join(', '));
    }

    if (problems.length) {
        console.error('PACK CONTRACT FAILED');
        for (const problem of problems) console.error('  - ' + problem);
        process.exit(1);
    }

    console.log('pack ok       ' + names.length + ' files, ' + parsed[0].size + ' bytes packed');
}

run();

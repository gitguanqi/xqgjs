#!/usr/bin/env node
/**
 * Regenerates lib/xqgjs-esm.js from lib/xqgjs.js.
 *
 * The package ships a UMD build and an ESM build as separate readable files. Keeping them
 * byte-identical in body is what makes a fix land twice, so the ESM copy is derived instead
 * of retyped: only the module wrapper and the final export line differ.
 *
 * Usage:
 *   node scripts/sync-esm.js           # rewrite lib/xqgjs-esm.js
 *   node scripts/sync-esm.js --check   # fail if it is out of date
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const UMD = 'lib/xqgjs.js';
const ESM = 'lib/xqgjs-esm.js';

function build(source) {
    const lines = source.replace(/\r\n/g, '\n').split('\n');

    let start = -1;
    for (let i = 0; i < lines.length; i += 1) {
        if (/^\}\)\(/.test(lines[i])) {
            start = i + 1;
            break;
        }
    }
    if (start === -1) throw new Error('could not find the end of the UMD wrapper');

    // the last `return Gjs;` belongs to the factory, earlier ones belong to Gjs.ready
    let end = -1;
    for (let i = lines.length - 1; i >= start; i -= 1) {
        if (/^\s*return Gjs;\s*$/.test(lines[i])) {
            end = i;
            break;
        }
    }
    if (end === -1) throw new Error('could not find the factory return');

    const body = lines.slice(start, end).map((line) => line.replace(/^ {2}/, ''));
    return body.join('\n').replace(/\s+$/, '') + '\nexport default Gjs;\n';
}

function main(argv) {
    const check = argv.includes('--check');
    const source = fs.readFileSync(path.join(ROOT, UMD), 'utf8');
    const expected = build(source);
    const target = path.join(ROOT, ESM);
    const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';

    if (check) {
        if (actual !== expected) {
            console.error(ESM + ' is out of date. Run `npm run sync`.');
            process.exit(1);
        }
        console.log('in sync       ' + ESM);
        return;
    }

    fs.writeFileSync(target, expected, 'utf8');
    console.log('wrote         ' + ESM + '  (' + Buffer.byteLength(expected, 'utf8') + ' bytes)');
}

main(process.argv.slice(2));

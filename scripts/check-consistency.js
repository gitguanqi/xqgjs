#!/usr/bin/env node
/**
 * Guards the two hand-maintained readable builds against drifting apart.
 *
 * The package ships a UMD build and an ESM build as separate files on purpose, so the same
 * fix has to be applied twice. That is exactly the situation where one copy silently keeps
 * the old bug. This script compares the two bodies after removing only the module wrapper
 * and indentation, and additionally cross-checks the version strings that used to disagree.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const UMD = 'lib/xqgjs.js';
const ESM = 'lib/xqgjs-esm.js';
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const EXPORT_LINES = /^(return Gjs;|export default Gjs;|\}\);)$/;

function readUtf8(relative) {
    const buffer = fs.readFileSync(path.join(ROOT, relative));
    let text;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (error) {
        throw new Error(relative + ' is not valid UTF-8');
    }
    if (text.charCodeAt(0) === 0xfeff) throw new Error(relative + ' starts with a BOM');
    // Line endings are normalised here so a Windows checkout still compares equal; git stores
    // LF because of .gitattributes.
    text = text.replace(/\r\n/g, '\n');
    if (!text.endsWith('\n')) throw new Error(relative + ' does not end with a newline');
    return text;
}

function umdBody(text) {
    const lines = text.split('\n');
    // The wrapper ends on the line that closes the outer call, e.g. `})(typeof globalThis ...`.
    let start = -1;
    for (let i = 0; i < lines.length; i += 1) {
        if (/^\}\)\(/.test(lines[i])) { start = i + 1; break; }
    }
    if (start === -1) throw new Error(UMD + ': could not locate the UMD wrapper end');
    const body = lines.slice(start);
    // The wrapper indents the body by two spaces; the ESM file is flat.
    return body.map((line) => line.replace(/^ {2}/, ''));
}

function esmBody(text) {
    return text.split('\n');
}

function normalize(lines) {
    const out = [];
    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (EXPORT_LINES.test(line)) continue;
        out.push(line);
    }
    return out;
}

function compare(a, b, labelA, labelB) {
    const limit = Math.max(a.length, b.length);
    for (let i = 0; i < limit; i += 1) {
        if (a[i] !== b[i]) {
            return {
                line: i + 1,
                a: a[i] === undefined ? '<end of file>' : a[i],
                b: b[i] === undefined ? '<end of file>' : b[i]
            };
        }
    }
    return null;
}

function infoOf(text) {
    const date = /date:\s*'([^']+)'/.exec(text);
    const version = /version:\s*'([^']+)'/.exec(text);
    return { date: date && date[1], version: version && version[1] };
}

const failures = [];

let umdText;
let esmText;
try {
    umdText = readUtf8(UMD);
    esmText = readUtf8(ESM);
} catch (error) {
    console.error('ENCODING  ' + error.message);
    process.exit(1);
}

const left = normalize(umdBody(umdText));
const right = normalize(esmBody(esmText));
const diff = compare(left, right, UMD, ESM);

if (diff) {
    failures.push(
        UMD + ' and ' + ESM + ' diverge at body line ' + diff.line + '\n' +
        '  ' + UMD + ': ' + diff.a + '\n' +
        '  ' + ESM + ': ' + diff.b
    );
}

const umdInfo = infoOf(umdText);
const esmInfo = infoOf(esmText);

if (umdInfo.date !== esmInfo.date) {
    failures.push('info.date differs: ' + UMD + '=' + umdInfo.date + ', ' + ESM + '=' + esmInfo.date);
}
if (umdInfo.version !== esmInfo.version) {
    failures.push('info.version differs: ' + UMD + '=' + umdInfo.version + ', ' + ESM + '=' + esmInfo.version);
}

const expectedVersion = 'v' + pkg.version;
if (umdInfo.version !== expectedVersion) {
    failures.push('info.version is ' + umdInfo.version + ' but package.json says ' + pkg.version);
}

if (failures.length) {
    console.error('CONSISTENCY FAILED');
    for (const failure of failures) console.error('  - ' + failure);
    process.exit(1);
}

console.log('consistent    ' + UMD + ' == ' + ESM + ' (' + left.length + ' body lines, version ' + umdInfo.version + ')');

'use strict';

/**
 * Guards the agent-facing metadata: `llms` / `agents` in package.json, the root `llms.txt` and
 * the portable skill under `skills/`.
 *
 * The point is not to police prose but to catch the failure modes that make this kind of
 * documentation worthless: a `package.json` pointer at a file that is not shipped, an API named
 * in the declarations but missing from `llms.txt`, a reference that only exists in the repo, or a
 * placeholder left behind. Everything is checked against the source of truth (`lib/xqgjs.js`,
 * `lib/xqgjs-esm.d.mts`, `package.json`), never against a second hand-written list.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, absolute, read } = require('./helpers/sandbox');

const pkg = JSON.parse(read('package.json'));

const LLMS = 'llms.txt';
const SKILL_DIR = 'skills/xqgjs-integration';
const SKILL = SKILL_DIR + '/SKILL.md';
const REFERENCES = ['references/api.md', 'references/components.md'];
const PLACEHOLDER = /\b(?:TODO|FIXME|TBD|XXX)\b|<placeholder>|\.\.\.$|example\.com/;

function shippedText(relative) {
    const buffer = fs.readFileSync(absolute(relative));
    let text;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (error) {
        throw new Error(relative + ' is not valid UTF-8');
    }
    assert.notEqual(text.charCodeAt(0), 0xfeff, relative + ' must not start with a BOM');
    assert.ok(text.trim().length > 0, relative + ' must not be empty');
    return text;
}

function whitelisted(relative) {
    return (pkg.files || []).some((entry) =>
        entry.endsWith('/')
            ? relative.startsWith(entry)
            : relative === entry || relative.startsWith(entry + '/'));
}

function frontmatter(text, relative) {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
    assert.ok(match, relative + ' must open with a YAML frontmatter block');
    const fields = {};
    for (const line of match[1].split('\n')) {
        const entry = /^([a-z][a-z0-9-]*):\s*(\S.*)$/.exec(line);
        if (entry) fields[entry[1]] = entry[2].trim();
    }
    return fields;
}

/** Names assigned as `Gjs.something =` in the readable source; `fn` / `prototype` are internals. */
function publicNames() {
    const source = read('lib/xqgjs.js');
    const names = [];
    for (const match of source.matchAll(/^ {2}Gjs\.([A-Za-z_$][\w$]*)\s*=/gm)) {
        const name = match[1];
        if (name === 'fn' || name === 'prototype') continue;
        if (!names.includes(name)) names.push(name);
    }
    return names;
}

/** Widgets reach the object through `gjs.extend({...})`, so they are not `Gjs.x =` assignments. */
const WIDGETS = ['Drag', 'Tab', 'Carousels', 'xqRecord'];

test('package.json points at shipped metadata files', () => {
    assert.equal(pkg.llms, './' + LLMS, 'llms must point at the root llms.txt');
    assert.equal(pkg.agents, './' + SKILL, 'agents must point at the skill entry point');

    for (const [field, relative] of [['llms', LLMS], ['agents', SKILL]]) {
        assert.match(pkg[field], /^\.\//, field + ' must be a package-root relative ./ path');
        assert.ok(fs.existsSync(absolute(relative)), field + ' target is missing: ' + relative);
        assert.ok(whitelisted(relative), field + ' target is not covered by files: ' + relative);
    }

    assert.ok(whitelisted(SKILL_DIR + '/references/api.md'), 'skill references must be shipped');
    assert.ok(!pkg.files.some((entry) => entry === 'scripts' || entry.startsWith('scripts')), 'scripts stay out of the tarball');
});

test('llms.txt is a readable UTF-8 document with a title and real import forms', () => {
    const text = shippedText(LLMS);

    assert.match(text.split('\n')[0], /^# xqgjs$/, 'llms.txt must start with a package title');
    assert.match(text, /npm install xqgjs/, 'llms.txt must show the install command');
    assert.ok(text.includes("import gjs from 'xqgjs'"), 'llms.txt must show the ESM import');
    assert.ok(text.includes("require('xqgjs')"), 'llms.txt must show the CommonJS import');
    assert.ok(text.endsWith('\n'), 'llms.txt must end with a newline');
});

test('llms.txt documents every public method in the source', () => {
    const text = read(LLMS);
    const names = publicNames();

    assert.ok(names.length > 50, 'the API extraction should find the whole surface, got ' + names.length);

    const missing = names.filter((name) =>
        !new RegExp('`(?:gjs\\.)?' + name + '(?![\\w$])').test(text));
    assert.deepEqual(missing, [], 'llms.txt is missing: ' + missing.join(', '));

    for (const widget of WIDGETS) {
        assert.match(text, new RegExp('`(?:new\\s+)?gjs\\.' + widget), 'llms.txt must document ' + widget);
    }
});

test('llms.txt covers every entry point the exports map exposes', () => {
    const text = read(LLMS);
    const skip = new Set(['.', './lib/*', './package.json']);

    const undocumented = Object.keys(pkg.exports)
        .filter((key) => !skip.has(key))
        .filter((key) => !text.includes('`' + (key === '.' ? 'xqgjs' : 'xqgjs' + key.slice(1))));

    assert.deepEqual(undocumented, [], 'llms.txt is missing entry points: ' + undocumented.join(', '));
});

test('llms.txt lists the named types the ESM declaration exports', () => {
    const text = read(LLMS);
    const declaration = read('lib/xqgjs-esm.d.mts');
    const block = /export type \{([\s\S]*?)\}/.exec(declaration);
    assert.ok(block, 'lib/xqgjs-esm.d.mts must export its named types');

    const types = block[1].split(',').map((entry) => entry.trim()).filter(Boolean);
    assert.ok(types.length >= 8, 'expected the shared type surface, got ' + types.length);
    for (const type of types) {
        assert.ok(text.includes('`' + type + '`'), 'llms.txt is missing the type ' + type);
    }
});

test('the skill frontmatter names a directory-matching, loadable skill', () => {
    const text = shippedText(SKILL);
    const fields = frontmatter(text, SKILL);

    assert.equal(fields.name, 'xqgjs-integration', 'skill name must match its directory');
    assert.match(fields.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'skill name must be lowercase and hyphenated');
    assert.equal(path.basename(SKILL_DIR), fields.name);

    assert.ok(fields.description && fields.description.length > 80, 'description must say what the skill covers');
    assert.match(fields.description, /xqgjs/, 'description must name the package');
    assert.match(fields.description, /[Ll]oad when/, 'description must state when to load it');
});

test('every reference the skill links to ships with the skill', () => {
    const text = read(SKILL);

    for (const reference of REFERENCES) {
        assert.ok(text.includes('references/' + path.basename(reference)), SKILL + ' must link ' + reference);

        const relative = SKILL_DIR + '/' + reference;
        assert.ok(fs.existsSync(absolute(relative)), 'linked reference is missing: ' + relative);
        assert.ok(whitelisted(relative), 'linked reference is not shipped: ' + relative);
        assert.ok(shippedText(relative).length > 500, relative + ' must carry real content');
    }
});

test('the skill stays an integration guide instead of a copy of llms.txt', () => {
    const skill = read(SKILL);
    const llms = read(LLMS);

    assert.ok(skill.length < llms.length, 'SKILL.md must stay shorter than the API reference');
    // A skill that repeats the whole method table would drift from llms.txt on the next release.
    const names = publicNames();
    const repeated = names.filter((name) => new RegExp('`gjs\\.' + name + '\\(').test(skill));
    assert.ok(
        repeated.length < names.length / 2,
        'SKILL.md should delegate the method table to references/api.md, found ' + repeated.length + ' repeated signatures'
    );
});

test('no placeholders survive in the agent metadata', () => {
    for (const relative of [LLMS, SKILL, ...REFERENCES.map((reference) => SKILL_DIR + '/' + reference)]) {
        assert.doesNotMatch(read(relative), PLACEHOLDER, relative + ' still contains a placeholder');
    }
});

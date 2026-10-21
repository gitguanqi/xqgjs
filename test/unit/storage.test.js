'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUMD } = require('./helpers/sandbox');
const { createEnv } = require('./helpers/dom');

const TRICKY = 'a b&c=%20中文?';

test('localStorage round-trips values that need encoding', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    assert.equal(gjs.setLocal('k', TRICKY), true);
    assert.equal(gjs.getLocal('k'), TRICKY);
    assert.notEqual(gjs.getLocal('k'), encodeURIComponent(TRICKY), 'value must not come back double encoded');
});

test('a missing key returns null, not the string "null"', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    const value = gjs.getLocal('definitely-not-set');
    assert.equal(value, null);
    assert.notEqual(value, 'null');
    assert.equal(gjs.getSession('definitely-not-set'), null);
});

test('remove and clear behave', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    gjs.setLocal('a', '1');
    gjs.setLocal('b', '2');
    gjs.rmLocal('a');
    assert.equal(gjs.getLocal('a'), null);
    assert.equal(gjs.getLocal('b'), '2');
    gjs.clearLocal();
    assert.equal(gjs.getLocal('b'), null);
});

test('sessionStorage behaves like localStorage', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    gjs.setSession('s', TRICKY);
    assert.equal(gjs.getSession('s'), TRICKY);
    gjs.rmSession('s');
    assert.equal(gjs.getSession('s'), null);
});

test('a corrupted stored value is returned raw instead of throwing', () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    env.window.localStorage.setItem('broken', '%E0%A4%A');
    assert.equal(gjs.getLocal('broken'), '%E0%A4%A');
});

test('a storage that throws on access degrades to null', () => {
    const env = createEnv({ throwOnStorage: true });
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    assert.equal(gjs.getLocal('x'), null);
    assert.equal(gjs.setLocal('x', 'y'), false);
});

test('cookies survive a value that contains "="', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    assert.equal(gjs.setCookie('token', 'a=b=c', 60), true);
    assert.equal(gjs.getCookie('token'), 'a=b=c');
    assert.equal(gjs.setCookie('name', '中文 值', 60), true);
    assert.equal(gjs.getCookie('name'), '中文 值');
});

test('getCookie can return every cookie at once', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    gjs.setCookie('one', '1', 60);
    gjs.setCookie('two', '2', 60);
    const all = gjs.getCookie(null, true);
    assert.equal(all.one, '1');
    assert.equal(all.two, '2');
});

test('a missing cookie reads as an empty string, and removal works', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    assert.equal(gjs.getCookie('nope'), '');
    gjs.setCookie('gone', 'x', 60);
    assert.equal(gjs.rmCookie('gone'), true);
    assert.equal(gjs.getCookie('gone'), '');
});

test('setCookie rejects bad arguments instead of writing a broken cookie', () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });

    assert.equal(gjs.setCookie('', 'x', 60), false);
    assert.equal(gjs.setCookie('name', null, 60), false);
    assert.equal(gjs.setCookie('name', 'x', 'sixty'), false);
    // a setter that already returns false must not also log
    assert.equal(env.logs.error.length, 0);
    assert.equal(env.document.cookie, '', 'nothing should have been written');
});

test('setCookie defaults to path=/ so the cookie is visible on every route', () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    const seen = [];
    Object.defineProperty(env.document, 'cookie', {
        configurable: true,
        get: () => '',
        set: (value) => seen.push(value)
    });
    gjs.setCookie('a', 'b', 60);
    assert.match(seen[0], /;path=\//);
});

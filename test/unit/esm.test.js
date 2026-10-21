'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUMD, loadESM, UMD_READABLE, UMD_MIN, ESM_READABLE, ESM_MIN } = require('./helpers/sandbox');
const { plain } = require('./helpers/plain');

test('the ESM build imports without throwing', async () => {
    const { gjs } = await loadESM(ESM_READABLE);
    assert.equal(typeof gjs, 'function');
    assert.equal(typeof gjs.info.version, 'string');
});

test('the minified ESM build imports without throwing', async () => {
    const { gjs } = await loadESM(ESM_MIN);
    assert.equal(typeof gjs, 'function');
    assert.equal(typeof gjs.checkEmail, 'function');
});

test('the ESM build never writes a global', async () => {
    const { gjs, env } = await loadESM(ESM_READABLE);
    assert.equal(env.window.gjs, undefined);
    assert.equal(env.window.$g, undefined);
    assert.equal(typeof gjs, 'function', 'the module still works without a global');
});

test('ESM and UMD expose the same static surface', async () => {
    const umd = loadUMD(UMD_READABLE).gjs;
    const esm = (await loadESM(ESM_READABLE)).gjs;

    assert.deepEqual(Object.keys(esm).sort(), Object.keys(umd).sort());
    assert.deepEqual(Object.keys(esm.fn).sort(), Object.keys(umd.fn).sort());
    assert.deepEqual(plain(esm.info), plain(umd.info));
});

test('the minified builds agree with the readable ones', async () => {
    const readable = loadUMD(UMD_READABLE).gjs;
    const minified = loadUMD(UMD_MIN).gjs;
    assert.deepEqual(Object.keys(minified).sort(), Object.keys(readable).sort());
    assert.deepEqual(Object.keys(minified.fn).sort(), Object.keys(readable.fn).sort());
    assert.deepEqual(plain(minified.info), plain(readable.info));

    const esmReadable = (await loadESM(ESM_READABLE)).gjs;
    const esmMin = (await loadESM(ESM_MIN)).gjs;
    assert.deepEqual(Object.keys(esmMin).sort(), Object.keys(esmReadable).sort());
    assert.deepEqual(plain(esmMin.info), plain(esmReadable.info));
});

test('the ESM build keeps the plugin constructors', async () => {
    const { gjs } = await loadESM(ESM_READABLE);
    for (const name of ['Drag', 'Tab', 'Carousels', 'xqRecord']) {
        assert.equal(typeof gjs[name], 'function', name);
    }
});

test('the prototype chain is intact after the ESM wrap', async () => {
    const { gjs } = await loadESM(ESM_READABLE);
    assert.equal(gjs.fn.init.prototype, gjs.fn);
    const box = gjs('#missing');
    assert.ok(box instanceof gjs);
    assert.equal(box.length, 0);
});

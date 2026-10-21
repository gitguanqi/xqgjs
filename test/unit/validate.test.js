'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUMD, loadESM } = require('./helpers/sandbox');

const CASES = [
    // [method, passing value, failing value]
    ['checkName', '张三abc', ''],
    ['checkUserName', 'a1234', '1abcd'],
    ['checkNameTwo', 'abc123', 'ab'],
    ['checkpassWord', 'Abc123!', 'abc123'],
    ['checkMobile', '13800138000', 'not-a-number'],
    ['checkPost', '123456', 'ab'],
    ['checkEmail', 'user@example.com', 'user@example'],
    ['checkCardId', '110101199003071234', '11010119900307']
];

test('every validator answers instead of throwing ReferenceError', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    for (const [method, good, bad] of CASES) {
        assert.equal(typeof gjs[method], 'function', method + ' must exist');
        assert.equal(gjs[method](good), true, method + '(' + JSON.stringify(good) + ')');
        assert.equal(gjs[method](bad), false, method + '(' + JSON.stringify(bad) + ')');
    }
});

test('validators reject non-string input instead of coercing it', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    for (const [method] of CASES) {
        for (const value of [undefined, null, 123, {}, [], true]) {
            assert.equal(gjs[method](value), false, method + ' with ' + String(value));
        }
    }
});

test('checkPassword is an alias of the historical checkpassWord', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    assert.equal(gjs.checkPassword, gjs.checkpassWord);
    assert.equal(gjs.checkPassword('Abc123!'), true);
});

test('a shared regex keeps no lastIndex state between calls', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    for (let i = 0; i < 3; i += 1) {
        assert.equal(gjs.checkEmail('user@example.com'), true);
        assert.equal(gjs.checkEmail('user@example.com'), true);
    }
});

test('regAll is still the public rule table', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    // the rules are built inside the sandbox realm, so instanceof RegExp would not apply
    assert.equal(Object.prototype.toString.call(gjs.regAll.emailReg), '[object RegExp]');
    assert.equal(Object.keys(gjs.regAll).length, 19);
    assert.equal(gjs.regAll.zhEnReg.source, '^([\\u4E00-\\uFA29]|[\\uE7C7-\\uE7F3]|[a-zA-Z0-9])+$');
});

test('the ESM build agrees with the UMD build on every validator', async () => {
    const umd = loadUMD('lib/xqgjs.js').gjs;
    const esm = (await loadESM('lib/xqgjs-esm.js')).gjs;
    for (const [method, good, bad] of CASES) {
        assert.equal(esm[method](good), umd[method](good), method + ' good value');
        assert.equal(esm[method](bad), umd[method](bad), method + ' bad value');
    }
});

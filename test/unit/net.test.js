'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUMD } = require('./helpers/sandbox');
const { createEnv } = require('./helpers/dom');
const { plain } = require('./helpers/plain');

function setup() {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    return { gjs, env };
}

test('http resolves the parsed body on a 2xx response', async () => {
    const { gjs, env } = setup();
    const promise = gjs.http('get', '/api/list');
    assert.equal(env.lastXhr.url, '/api/list');
    assert.equal(env.lastXhr.method, 'get');
    env.lastXhr.respond(200, '{"items":[1,2]}');

    const result = await promise;
    assert.equal(result.code, 200);
    assert.equal(result.msg, 'get_succ');
    assert.equal(result.data.info, '获取成功!');
    assert.deepEqual(plain(result.data.data), { items: [1, 2] });
});

test('http treats every 2xx as success, not only 200', async () => {
    const { gjs, env } = setup();
    const promise = gjs.http('get', '/api/created');
    env.lastXhr.respond(201, '{"ok":true}');
    const result = await promise;
    assert.equal(result.code, 201);
});

test('http resolves a 204 with null data', async () => {
    const { gjs, env } = setup();
    const promise = gjs.http('delete', '/api/x');
    env.lastXhr.respond(204, '');
    const result = await promise;
    assert.equal(result.code, 204);
    assert.equal(result.data.data, null);
});

test('http rejects a non 2xx response with get_fail', async () => {
    const { gjs, env } = setup();
    const promise = gjs.http('get', '/missing');
    env.lastXhr.respond(404, '');
    await assert.rejects(promise, (error) => {
        assert.equal(error.code, 404);
        assert.equal(error.msg, 'get_fail');
        return true;
    });
});

test('http rejects a non-JSON body with parse_fail and keeps the raw text', async () => {
    const { gjs, env } = setup();
    const promise = gjs.http('get', '/page.html');
    env.lastXhr.respond(200, '<html>not json</html>');
    await assert.rejects(promise, (error) => {
        assert.equal(error.msg, 'parse_fail');
        assert.equal(error.data.raw, '<html>not json</html>');
        return true;
    });
});

test('http rejects a network failure instead of hanging', async () => {
    const { gjs, env } = setup();
    const promise = gjs.http('get', '/offline');
    env.lastXhr.failNetwork();
    await assert.rejects(promise, (error) => {
        assert.equal(error.msg, 'network_error');
        return true;
    });
});

test('httpSimple reports success with code 200 and failure with code 101', () => {
    const { gjs, env } = setup();

    const ok = [];
    gjs.httpSimple('get', '/a', null, (res) => ok.push(res));
    env.lastXhr.respond(200, '[1,2]');
    assert.equal(ok.length, 1);
    assert.equal(ok[0].code, 200);
    assert.deepEqual(plain(ok[0].data), [1, 2]);

    const fail = [];
    gjs.httpSimple('get', '/b', null, (res) => fail.push(res));
    env.lastXhr.respond(500, '');
    assert.equal(fail.length, 1);
    assert.equal(fail[0].code, 101);
    assert.equal(fail[0].msg, 'get_fail');
});

test('jsonp builds a correct callback URL in both shapes', () => {
    const { gjs, env } = setup();

    const plain = gjs.jsonp('/api/data', 'cb');
    assert.equal(plain.src, '/api/data?callback=cb');

    const withQuery = gjs.jsonp('/api/data?x=1', 'cb');
    assert.equal(withQuery.src, '/api/data?x=1&callback=cb');

    assert.equal(gjs.jsonp('', 'cb'), null);
    assert.equal(env.document.head.children.length, 2);
});

test('getUrlArgs survives every awkward URL shape', () => {
    const { gjs } = setup();
    const check = (input, expected) => {
        assert.equal(JSON.stringify(gjs.getUrlArgs(input)), JSON.stringify(expected), 'getUrlArgs(' + JSON.stringify(input) + ')');
    };

    check('https://a.com/path', {});
    check('?a=1', { a: '1' });
    check('?a=', { a: '' });
    check('?a=1&a=2', { a: '2' });
    check('?a=1#hash', { a: '1' });
    check('?name=%E4%B8%AD%E6%96%87', { name: '中文' });
    check('?q=a+b', { q: 'a b' });
    check('', {});
    check(undefined, {});
    check('?broken=%E0%A4%A', { broken: '%E0%A4%A' });
});

test('getUrlArgs falls back to the current location', () => {
    const env = createEnv();
    env.window.location.search = '?from=location';
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    assert.equal(JSON.stringify(gjs.getUrlArgs()), JSON.stringify({ from: 'location' }));
});

test('fullScreen requests fullscreen through the available vendor method', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');
    let requested = 0;
    div.requestFullscreen = () => { requested += 1; };
    gjs.fullScreen(div, 'click');
    div.dispatch('click');
    assert.equal(requested, 1);
});

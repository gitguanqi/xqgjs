'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUMD } = require('./helpers/sandbox');
const { createEnv } = require('./helpers/dom');

function setup(options) {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', Object.assign({ env }, options || {}));
    return { gjs, env };
}

test('the UMD build loads under strict mode', () => {
    // this is the regression that made the ESM build unusable: an undeclared assignment
    // throws as soon as the file is evaluated in strict mode
    assert.doesNotThrow(() => loadUMD('lib/xqgjs.js', { strict: true }));
});

test('the factory exposes both globals and they are the same object', () => {
    const { gjs, env } = setup();
    assert.equal(typeof gjs, 'function');
    assert.equal(env.window.gjs, gjs);
    assert.equal(env.window.$g, gjs);
});

test('init wraps a selector, an element, and reports a miss', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');
    div.id = 'target';
    env.document.body.appendChild(div);

    const bySelector = gjs('#target');
    assert.equal(bySelector[0], div);
    assert.equal(bySelector.length, 1);

    const byElement = gjs(div);
    assert.equal(byElement[0], div);
    assert.equal(byElement.length, 1);

    const miss = gjs('#missing');
    assert.equal(miss[0], null);
    assert.equal(miss.length, 0);
    assert.doesNotThrow(() => miss.setAttr('a', 'b'));
});

test('attribute helpers chain and keep working on a miss', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');
    div.id = 'a';
    env.document.body.appendChild(div);

    const box = gjs('#a');
    assert.equal(box.setAttr('data-x', '1'), box);
    assert.equal(box.getAttr('data-x'), '1');
    box.delAttr('data-x');
    assert.equal(box.getAttr('data-x'), null);
});

test('css applies every property, not just the first', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');
    div.id = 'a';
    env.document.body.appendChild(div);

    gjs('#a').css({ color: 'red', fontSize: '12px', display: 'none' });
    assert.equal(div.style.color, 'red');
    assert.equal(div.style.fontSize, '12px');
    assert.equal(div.style.display, 'none');

    gjs.css(div, { color: 'blue', opacity: '0.5' });
    assert.equal(div.style.color, 'blue');
    assert.equal(div.style.opacity, '0.5');
});

test('css reports a non-object argument but does not throw', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');
    assert.doesNotThrow(() => gjs.css(div, 'color:red'));
    assert.equal(env.logs.error.length, 1);
});

test('classList replaces every class instead of assigning the read-only property', () => {
    const { gjs, env } = setup({ strict: true });
    const div = env.document.createElement('div');
    div.className = 'old stale';

    gjs.classList(div, 'a b');
    assert.equal(div.className, 'a b');
    assert.equal(div.classList.contains('a'), true);
    assert.equal(div.classList.contains('stale'), false);
});

test('addCls, delCls and toggleCls accept several names at once', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');

    gjs.addCls(div, 'a b');
    assert.equal(div.classList.contains('a'), true);
    assert.equal(div.classList.contains('b'), true);

    gjs.addCls(div, ['c', 'd']);
    assert.equal(div.classList.contains('d'), true);

    gjs.delCls(div, 'a c');
    assert.equal(div.classList.contains('a'), false);
    assert.equal(div.classList.contains('c'), false);

    gjs.toggleCls(div, 'b');
    assert.equal(div.classList.contains('b'), false);
    gjs.toggleCls(div, 'b', true);
    assert.equal(div.classList.contains('b'), true);

    assert.equal(gjs.hasCls(div, 'b'), true);
    assert.equal(gjs.hasCls(null, 'b'), false);
    assert.equal(gjs.indexCls(div, 0), 'd');
});

test('instance class helpers delegate to the static ones', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');
    div.id = 'a';
    env.document.body.appendChild(div);

    const box = gjs('#a');
    box.addCls('x y').delCls('y').toggleCls('z').toggleCls('z');
    assert.equal(div.classList.contains('x'), true);
    assert.equal(div.classList.contains('y'), false);
    assert.equal(box.hasCls('x'), true);
    assert.equal(box.hasCls('z'), false);
});

test('dom mutation helpers attach, insert, replace and remove', () => {
    const { gjs, env } = setup();
    const parent = env.document.createElement('div');
    const a = env.document.createElement('span');
    const b = env.document.createElement('span');
    const c = env.document.createElement('span');

    gjs.addElem(parent, a);
    assert.equal(parent.children.length, 1);

    gjs.insertElem(parent, b, a);
    assert.equal(parent.children[0], b);

    gjs.replaceElem(parent, c, a);
    assert.equal(parent.children.indexOf(a), -1);
    assert.equal(parent.children.indexOf(c), 1);
    assert.equal(env.logs.log.length, 0, 'replaceElem must not log');

    gjs.delElem(parent, b);
    assert.equal(parent.children.length, 1);
});

test('cloneElem copies the subtree only when asked', () => {
    const { gjs, env } = setup();
    const parent = env.document.createElement('div');
    parent.appendChild(env.document.createElement('span'));

    assert.equal(gjs.cloneElem(parent, false).children.length, 0);
    assert.equal(gjs.cloneElem(parent, true).children.length, 1);
    assert.equal(gjs.cloneElem(null), null);
});

test('traversal helpers are null-safe', () => {
    const { gjs, env } = setup();
    const parent = env.document.createElement('div');
    const first = env.document.createElement('span');
    const second = env.document.createElement('span');
    parent.appendChild(first);
    parent.appendChild(second);

    assert.equal(gjs.parent(first), parent);
    assert.equal(gjs.first(parent), first);
    assert.equal(gjs.last(parent), second);
    assert.equal(gjs.next(first), second);
    assert.equal(gjs.prev(second), first);
    assert.equal(gjs.parent(null), null);
});

test('each walks arrays and objects and stops on false', () => {
    const { gjs } = setup();
    const seen = [];
    const list = [10, 20, 30];
    assert.equal(gjs.each(list, (index, value) => {
        seen.push([index, value]);
    }), list, 'each returns the list it was given');
    assert.deepEqual(seen, [[0, 10], [1, 20], [2, 30]]);

    const stopped = [];
    gjs.each([1, 2, 3, 4], (index, value) => {
        stopped.push(value);
        return value < 2;
    });
    assert.deepEqual(stopped, [1, 2]);

    const keys = [];
    gjs.each({ a: 1, b: 2 }, (key) => {
        keys.push(key);
    });
    assert.deepEqual(keys.sort(), ['a', 'b']);

    assert.equal(gjs.each(null, () => {}), null);
});

test('the instance each walks the wrapped element', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');
    div.id = 'a';
    env.document.body.appendChild(div);

    const visited = [];
    gjs('#a').each((index, elem) => {
        visited.push([index, elem]);
    });
    assert.deepEqual(visited, [[0, div]]);
});

test('ready runs immediately when the document is already parsed', () => {
    const { gjs } = setup();
    let called = 0;
    gjs.ready(() => {
        called += 1;
    });
    assert.equal(called, 1);
});

test('ready waits for DOMContentLoaded while parsing', () => {
    const env = createEnv();
    env.document.readyState = 'loading';
    const { gjs } = loadUMD('lib/xqgjs.js', { env });

    let called = 0;
    gjs.ready(() => {
        called += 1;
    });
    assert.equal(called, 0);
    env.document.dispatch('DOMContentLoaded');
    assert.equal(called, 1);
    env.document.dispatch('DOMContentLoaded');
    assert.equal(called, 1, 'the handler must only run once');
});

test('on and off bind and unbind space separated event names', () => {
    const { gjs, env } = setup();
    const div = env.document.createElement('div');
    div.id = 'a';
    env.document.body.appendChild(div);

    let clicks = 0;
    let focus = 0;
    const handler = (event) => {
        if (event.type === 'click') clicks += 1;
        else focus += 1;
    };

    gjs('#a').on('click focus', handler);

    div.dispatch('click');
    div.dispatch('focus');
    assert.equal(clicks, 1);
    assert.equal(focus, 1);
    assert.equal(div.listenerCount('click'), 1);

    gjs('#a').off('click focus', handler);
    div.dispatch('click');
    div.dispatch('focus');
    assert.equal(clicks, 1, 'off must have removed the listener');
    assert.equal(focus, 1);
    assert.equal(div.listenerCount('click'), 0);
});

test('extend copies own properties onto the target', () => {
    const { gjs } = setup();
    gjs.extend({ hello: 'world' });
    assert.equal(gjs.hello, 'world');
    assert.doesNotThrow(() => gjs.extend());
    assert.doesNotThrow(() => gjs.fn.extend({ ping() { return 'pong'; } }));
    assert.equal(gjs('#x').ping(), 'pong');
    assert.equal(gjs.fn.init.prototype, gjs.fn);
});

test('the prototype chain survives the new instance methods', () => {
    const { gjs } = setup();
    assert.equal(gjs.fn.init.prototype, gjs.fn);
    assert.equal(gjs.fn.constructor, gjs);
    const box = gjs('#x');
    assert.ok(box instanceof gjs);
});

test('alerts and timers reach the window', () => {
    const { gjs, env } = setup();
    gjs.alert('hi');
    assert.deepEqual(env.calls.alert, ['hi']);
    assert.equal(gjs.confirm('sure?'), true);
    assert.equal(gjs.prompt('name?', 'tip'), 'answer');
});

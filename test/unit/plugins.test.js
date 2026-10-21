'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUMD } = require('./helpers/sandbox');
const { createEnv } = require('./helpers/dom');

function setup() {
    const env = createEnv();
    env.document.documentElement.clientWidth = 1024;
    env.document.documentElement.clientHeight = 768;
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    return { gjs, env };
}

function draggable(env, left, top) {
    const elem = env.document.createElement('div');
    elem.offsetLeft = left;
    elem.offsetTop = top;
    elem.offsetWidth = 100;
    elem.offsetHeight = 50;
    env.document.body.appendChild(elem);
    return elem;
}

test('Drag keeps window.onresize and document handlers untouched', () => {
    const { gjs, env } = setup();
    const sentinel = () => {};
    env.window.onresize = sentinel;
    env.document.onmousemove = null;
    env.document.onmouseup = null;

    const elem = draggable(env, 10, 20);
    const drag = new gjs.Drag(elem);

    assert.equal(env.window.onresize, sentinel, 'a global onresize assignment would break the page');
    assert.equal(env.document.onmousemove, null);
    assert.equal(env.document.onmouseup, null);
    assert.equal(env.document.listenerCount('window:resize'), 1, 'resize must be an addEventListener listener');

    drag.destroy();
    assert.equal(env.window.onresize, sentinel);
    assert.equal(env.document.listenerCount('window:resize'), 0);
});

test('Drag moves the element and stops on mouseup', () => {
    const { gjs, env } = setup();
    const elem = draggable(env, 10, 20);
    new gjs.Drag(elem);

    elem.dispatch('mousedown', { clientX: 30, clientY: 40 });
    env.document.dispatch('mousemove', { clientX: 100, clientY: 120 });

    assert.equal(elem.style.left, '80px');
    assert.equal(elem.style.top, '100px');

    env.document.dispatch('mouseup');
    assert.equal(env.document.listenerCount('mousemove'), 0, 'mouseup must release the document listeners');

    env.document.dispatch('mousemove', { clientX: 400, clientY: 400 });
    assert.equal(elem.style.left, '80px', 'a released drag must not keep moving');
});

test('Drag clamps the element inside the viewport', () => {
    const { gjs, env } = setup();
    env.document.documentElement.clientWidth = 500;
    env.document.documentElement.clientHeight = 400;

    const elem = draggable(env, 0, 0);
    const drag = new gjs.Drag(elem);

    drag.move(1000, 1000);
    assert.equal(elem.style.left, '400px');
    assert.equal(elem.style.top, '350px');

    drag.move(-50, -50);
    assert.equal(elem.style.left, '0px');
    assert.equal(elem.style.top, '0px');
});

test('two Drag instances work independently', () => {
    const { gjs, env } = setup();
    const first = draggable(env, 0, 0);
    const second = draggable(env, 0, 0);

    const a = new gjs.Drag(first);
    const b = new gjs.Drag(second);

    first.dispatch('mousedown', { clientX: 5, clientY: 5 });
    env.document.dispatch('mousemove', { clientX: 25, clientY: 25 });
    assert.equal(first.style.left, '20px');
    env.document.dispatch('mouseup');

    second.dispatch('mousedown', { clientX: 5, clientY: 5 });
    env.document.dispatch('mousemove', { clientX: 45, clientY: 45 });
    assert.equal(second.style.left, '40px');
    env.document.dispatch('mouseup');

    a.destroy();
    b.destroy();
});

test('Tab keeps unrelated classes and can be torn down', () => {
    const { gjs, env } = setup();
    const navs = [env.document.createElement('a'), env.document.createElement('a')];
    const contents = [env.document.createElement('div'), env.document.createElement('div')];

    navs.forEach((nav, index) => {
        nav.className = 'tab-btn';
        nav.textContent = 'nav' + index;
        env.document.body.appendChild(nav);
    });
    contents.forEach((panel, index) => {
        panel.className = 'panel';
        panel.textContent = 'panel' + index;
        env.document.body.appendChild(panel);
    });

    const tab = new gjs.Tab(navs, contents, 'active', 'click');

    navs[1].dispatch('click');
    assert.equal(navs[0].classList.contains('tab-btn'), true, 'unrelated classes must survive');
    assert.equal(navs[0].classList.contains('active'), false);
    assert.equal(navs[1].classList.contains('active'), true);
    assert.equal(navs[1].classList.contains('tab-btn'), true);
    assert.equal(contents[1].classList.contains('active'), true);
    assert.equal(contents[0].classList.contains('active'), false);
    assert.equal(contents[0].classList.contains('panel'), true);

    navs[0].dispatch('click');
    assert.equal(navs[0].classList.contains('active'), true);
    assert.equal(navs[1].classList.contains('active'), false);

    tab.destroy();
    navs[1].dispatch('click');
    assert.equal(navs[0].classList.contains('active'), true, 'after destroy nothing should change');
});

test('Carousels honours isAuto: false', () => {
    const { gjs, env } = setup();
    const contents = env.document.createElement('div');
    const lis = [env.document.createElement('img'), env.document.createElement('img')];

    const manual = new gjs.Carousels(contents, lis, null, null, null, 'active', 1000, false);
    assert.equal(manual.isAuto, false);
    assert.equal(env.timers.length, 0, 'isAuto:false must not start a timer');

    manual.destroy();

    const auto = new gjs.Carousels(contents, lis, null, null, null, 'active', 1000);
    assert.equal(auto.isAuto, true, 'an omitted flag still means auto');
    assert.equal(env.timers.length, 1);
    auto.destroy();
    assert.equal(env.timers.length, 0);
});

test('Carousels does not stack timers on repeated hover cycles', () => {
    const { gjs, env } = setup();
    const contents = env.document.createElement('div');
    const lis = [env.document.createElement('img')];

    const carousel = new gjs.Carousels(contents, lis, null, null, null, 'active', 1000);

    for (let i = 0; i < 3; i += 1) {
        contents.dispatch('mouseover');
        assert.equal(env.timers.length, 0, 'hover stops the timer');
        contents.dispatch('mouseout');
        assert.equal(env.timers.length, 1, 'leaving restarts exactly one timer');
    }

    carousel.destroy();
    assert.equal(env.timers.length, 0);
    assert.equal(contents.listenerCount('mouseover'), 0);
});

test('Carousels moves by the item size and highlights the right dot', () => {
    const { gjs, env } = setup();
    const contents = env.document.createElement('div');
    const lis = [env.document.createElement('img'), env.document.createElement('img'), env.document.createElement('img')];
    lis.forEach((li) => { li.clientWidth = 320; li.clientHeight = 200; });
    const btns = [env.document.createElement('i'), env.document.createElement('i'), env.document.createElement('i')];
    btns.forEach((btn) => {
        btn.className = 'dot';
    });

    const carousel = new gjs.Carousels(contents, lis, null, null, btns, 'active', 5000, false);

    carousel.num = 2;
    carousel.move();
    assert.equal(contents.style.left, '-640px');
    assert.equal(btns[2].classList.contains('active'), true);
    assert.equal(btns[0].classList.contains('active'), false);
    assert.equal(btns[0].classList.contains('dot'), true, 'the dot keeps its base class');

    btns[1].dispatch('mouseover');
    assert.equal(carousel.num, 1);
    assert.equal(btns[1].classList.contains('active'), true);
    assert.equal(btns[2].classList.contains('active'), false);
});

test('Carousels arrows wrap around both ends', () => {
    const { gjs, env } = setup();
    const contents = env.document.createElement('div');
    const lis = [env.document.createElement('img'), env.document.createElement('img'), env.document.createElement('img')];
    const left = env.document.createElement('button');
    const right = env.document.createElement('button');

    const carousel = new gjs.Carousels(contents, lis, left, right, null, 'active', 5000, false);

    right.dispatch('click');
    assert.equal(carousel.num, 1);
    right.dispatch('click');
    right.dispatch('click');
    assert.equal(carousel.num, 0, 'moving past the last item wraps to the first');

    left.dispatch('click');
    assert.equal(carousel.num, 2, 'moving before the first item wraps to the last');
});

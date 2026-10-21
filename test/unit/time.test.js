'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUMD } = require('./helpers/sandbox');
const { createEnv } = require('./helpers/dom');

test('secondToTime pads single digits and rolls over cleanly', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    const cases = [
        [0, '00:00:00'],
        [9, '00:00:09'],
        [10, '00:00:10'],
        [59, '00:00:59'],
        [60, '00:01:00'],
        [600, '00:10:00'],
        [3599, '00:59:59'],
        [3600, '01:00:00'],
        [3661, '01:01:01'],
        [86399, '23:59:59'],
        [86400, '24:00:00'],
        [-5, '00:00:00'],
        [Number.NaN, '00:00:00'],
        ['120', '00:02:00']
    ];
    for (const [input, expected] of cases) {
        assert.equal(gjs.secondToTime(input), expected, 'secondToTime(' + input + ')');
    }
});

test('every segment stays two characters wide', () => {
    const { gjs } = loadUMD('lib/xqgjs.js');
    for (let seconds = 0; seconds < 4000; seconds += 7) {
        assert.match(gjs.secondToTime(seconds), /^\d{2,}:\d{2}:\d{2}$/, 'secondToTime(' + seconds + ')');
    }
});

test('setTimeout and setInterval return the id that clear* needs', () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });

    let fired = 0;
    const id = gjs.setTimeout(() => {
        fired += 1;
    }, 10);

    assert.equal(typeof id, 'number');
    gjs.clearTimeout(id);
    env.tick(50);
    assert.equal(fired, 0, 'a cleared timeout must not fire');

    let ticks = 0;
    const interval = gjs.setInterval(() => {
        ticks += 1;
    }, 10);
    assert.equal(typeof interval, 'number');
    env.tick(30);
    const seen = ticks;
    assert.ok(seen >= 1, 'interval should have fired');
    gjs.clearInterval(interval);
    env.tick(60);
    assert.equal(ticks, seen, 'a cleared interval must stop firing');
});

test('getTime renders a real date and can be stopped', () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    const target = env.document.createElement('div');

    const timer = gjs.getTime(target);
    assert.equal(typeof timer, 'number', 'getTime must return the interval id');

    const now = new Date();
    const expected = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

    assert.match(target.innerHTML, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.ok(target.innerHTML.startsWith(expected), 'getTime must use the day of month, not the weekday');
    assert.equal(gjs.getTime(null), null, 'no element means no timer');

    gjs.clearTime(timer);
    assert.equal(env.timers.length, 0);
});

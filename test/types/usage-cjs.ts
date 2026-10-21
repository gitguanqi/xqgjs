// CommonJS consumption: `require('xqgjs')` must reach lib/xqgjs.d.ts.
import gjs = require('xqgjs');

const version: string = gjs.info.version;
const instance = gjs('#app');

instance.setAttr('data-state', 'ready').addCls('is-ready is-active');
const has: boolean = instance.hasCls('is-ready');

const eachResult: number[] = gjs.each([1, 2, 3], (index, value) => {
    return value > index;
}) as number[];

gjs.ready((api) => {
    api.checkEmail('user@example.com');
});

const drag = new gjs.Drag(document.body);
drag.move(10, 20);
drag.destroy();

gjs.http<{ items: number[] }>('get', '/api.json')
    .then((res) => res.data.data.items.length)
    .catch((err: { code: number; msg: string }) => err.msg);

gjs.getUrlArgs('?a=1').a;
gjs.secondToTime(3661);
gjs.setCookie('token', 'abc', 3600);
gjs.getCookie('token');

// @ts-expect-error the validator takes a string, not a number
gjs.checkEmail(123);

// @ts-expect-error unknown method must not be accepted silently
gjs.notARealMethod();

export { version, has, eachResult };

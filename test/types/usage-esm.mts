// ESM consumption: `import gjs from 'xqgjs'` must reach lib/xqgjs-esm.d.ts, and the ESM
// declaration must not augment the global scope.
import gjs from 'xqgjs';
import type { GjsInstance, GjsInfo } from 'xqgjs';

const info: GjsInfo = gjs.info;
const box: GjsInstance = gjs(document.body);
box.css({ color: 'red', fontSize: '12px' }).each((index, elem) => {
    elem.tagName;
});
box.on('click', (event) => event.preventDefault());
box.off('click', () => undefined);

const carousel = new gjs.Carousels(document.body, [document.body], null, null, null, 'active', 3000, false, 'left');
carousel.destroy();

const args: Record<string, string> = gjs.getUrlArgs('https://example.com/?q=xqgjs');
const text: string = gjs.secondToTime(10);

// @ts-expect-error isAuto is a boolean
new gjs.Carousels(document.body, [document.body], null, null, null, 'active', 3000, 'yes', 'left');

export { info, args, text };

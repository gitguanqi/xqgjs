# xqgjs

A small jQuery-like helper library for the browser: DOM shortcuts, validation, storage,
cookies, XHR wrappers, plus a few self-contained widgets.

[中文文档](./zh.md) · [Changelog](./CHANGELOG.md)

- Zero runtime dependencies
- Ships UMD (script / CommonJS / AMD) and ESM builds, each with a minified variant
- ES2017 output — no IE support, no polyfills bundled
- TypeScript declarations for all three consumption paths

```js
// release metadata, kept in sync with package.json
console.log(gjs.info);
// {name: 'gjs', date: '2026-10-20', version: 'v2.0.0'}
```

## Install

### Script tag (UMD)

```html
<script src="https://xqgj.cc/xqcdn/libs/xqgjs/xqgjs.min.js"></script>
<script>
    gjs('#app').html('hello');
    $g('#app').addCls('ready'); // $g is an alias of gjs
</script>
```

### ESM

```html
<script type="module">
    import gjs from './node_modules/xqgjs/lib/xqgjs-esm.min.js';
    gjs('#app').html('hello');
</script>
```

### Bundler

```js
import gjs from 'xqgjs'; // resolves to lib/xqgjs-esm.js + lib/xqgjs-esm.d.mts
```

```js
const gjs = require('xqgjs'); // resolves to lib/xqgjs.js + lib/xqgjs.d.ts
```

### Entry points

| Specifier        | File                       | Format |
| ---------------- | -------------------------- | ------ |
| `xqgjs`          | `lib/xqgjs-esm.js` (ESM) / `lib/xqgjs.js` (CJS) | auto   |
| `xqgjs/esm`      | `lib/xqgjs-esm.js`         | ESM    |
| `xqgjs/min`      | `lib/xqgjs.min.js`         | UMD    |
| `xqgjs/esm.min`  | `lib/xqgjs-esm.min.js`     | ESM    |
| `xqgjs/loading`  | `lib/loading/js/loading.js` | script |
| `xqgjs/mourn`    | `lib/mourn/mourn.js`       | script |

The two component entry points are side-effectful: loading the file mounts the component.
`package.json` declares them in `sideEffects` so bundlers keep them.

## Usage

### Wrapping an element

```js
gjs('h3')          // first match, or an empty wrapper when nothing matched
gjs(document.body) // a live element
```

An instance is array-like: `[0]` is the element, `length` is `0` or `1`.

```js
gjs('#box')
    .addCls('active')
    .css({ color: '#0ff', 'font-size': '14px' })
    .text('done')
    .on('click', () => console.log('clicked'));
```

Instance methods: `setAttr`, `getAttr`, `delAttr`, `text`, `html`, `css`, `each`, `on`,
`off`, `addCls`, `delCls`, `toggleCls`, `hasCls`.

### DOM helpers

```js
gjs.gId('app');            // document.getElementById
gjs.gCls('item');          // live HTMLCollection of getElementsByClassName
gjs.gTag('li');
gjs.gName('q');
gjs.dom('#app');           // document.querySelector
gjs.domAll('.item');       // document.querySelectorAll
gjs.cElem('div');          // createElement, the param is the tag name
gjs.cText('hi');           // createTextNode
gjs.addElem(parent, child);
gjs.insertElem(parent, newElem, refElem); // refElem null appends
gjs.replaceElem(parent, newElem, oldElem);
gjs.cloneElem(elem, true); // second param is isDeep
gjs.delElem(parent, child);
gjs.parent(elem);          // parentNode — the *Elem twin returns parentElement
gjs.child(elem);           // childNodes
gjs.first(elem) / gjs.last(elem) / gjs.next(elem) / gjs.prev(elem)
```

Each traversal helper has an `*Elem` twin that skips text nodes:
`parentElem`, `childElem`, `firstElem`, `lastElem`, `nextElem`, `prevElem`.

### Iteration and readiness

```js
gjs.each([1, 2, 3], (index, value) => {
    if (value === 2) return false; // break
});

gjs.ready((api) => {
    // runs immediately when the document is already parsed
});
```

`each` works on arrays, `NodeList`s and plain objects, and returns the original collection.

### Validation

Every validator takes one value and returns a boolean. Anything that is not a string returns
`false`, and the shared regexes are reset before each test, so repeated calls stay stable.

```js
gjs.checkName('张三');        // Chinese characters, Latin letters and digits only
gjs.checkNameTwo('ab_1');     // Latin letters, digits, _ and -, 4-16 chars
gjs.checkUserName('zhang3');  // starts with a letter, 5-16 word chars
gjs.checkMobile('13800138000');
gjs.checkEmail('a@b.com');
gjs.checkPost('abc123');      // 3-12 letters or digits
gjs.checkCardId('110101199003078515');
gjs.checkpassWord('Abc123!x'); // alias: gjs.checkPassword
```

The full rule set is readable at `gjs.regAll` if you need to reuse a pattern.

### Storage and cookies

```js
gjs.setLocal('token', 'abc');    // values are URI-encoded, so '=' and '&' survive
gjs.getLocal('token');           // 'abc', or null when the key is absent
gjs.rmLocal('token');
gjs.clearLocal();
// the same four for session storage: setSession / getSession / rmSession / clearSession

gjs.setCookie('token', 'abc');          // defaults to path=/
gjs.getCookie('token');                 // '' when absent, '=' inside values is kept
gjs.rmCookie('token');
```

Store objects yourself with `JSON.stringify` / `JSON.parse` — the storage helpers only wrap
`encodeURIComponent` / `decodeURIComponent`. When storage is blocked (private mode, disabled
cookies) the setters return `false` and the getters return `null` instead of throwing.

### Timers, time and URL

```js
const id = gjs.setTimeout(fn, 300);  // returns the timer id
gjs.clearTimeout(id);

gjs.getTime(elem);         // fills elem with a live YYYY-MM-DD HH:mm:ss clock, returns its id
gjs.clearTime(id);         // alias of clearInterval

gjs.secondToTime(10);      // '00:00:10'
gjs.secondToTime(3661);    // '01:01:01'

gjs.getUrlArgs();          // { q: 'a b' } — '+' decoded, '#' stripped, never throws
gjs.fullScreen(elem);
```

### HTTP

`gjs.http` takes `(method, url, data)` and returns a promise that resolves with the parsed body
and rejects with a structured failure — never with `undefined`.

```js
gjs.http('GET', '/api/list')
    .then((res) => console.log(res.code, res.data))
    .catch((err) => console.warn(err.msg, err.data.info));
// err.msg is one of: no_xhr · open_fail · send_fail · get_fail · parse_fail · network_error
```

```js
gjs.httpSimple('POST', '/api/save', 'a=1', (result) => {
    // result.code is 200 on success, 101 on failure
});
```

Failures carry `data.raw` with the original response text, so a proxy's HTML error page is still
inspectable.

`gjs.jsonp(url, 'callbackName', onError)` covers cross-origin endpoints that only speak JSONP.

### Files

```js
// copies the visible text of an element (or an id); resolves to true on success
await gjs.copyText('code-block');

// downloads a URL and returns the blob URL, or rejects on a non-2xx response
gjs.downloadFile('/export/rows.csv', 'rows.csv');

// exports a <table>'s HTML as .xls; returns true, or false when the target is missing
gjs.exportExcel('data-table', 'rows.xls');

// parses the first file of an <input type="file"> with SheetJS and dumps the rows into #demo
await gjs.importFile(input, 'demo'); // resolves with the parsed rows
```

`copyText` uses `navigator.clipboard` and falls back to a hidden textarea, so it also works on
plain http origins. `importFile` needs the `XLSX` global (SheetJS) and rejects clearly when it
is absent.

### Widgets

```js
const drag = new gjs.Drag(document.getElementById('box'));
drag.move(left, top); // clamped to the viewport
drag.destroy();       // unbinds resize / mousemove / mouseup

// Tab(navs, contents, clsName = 'active', eventType = 'click')
const tabs = new gjs.Tab(document.querySelectorAll('.tab-btn'), document.querySelectorAll('.panel'));
tabs.destroy();

// Carousels(contents, contentLis, arrowLeft, arrowRight, btns, active, dealy, isAuto, type)
const carousel = new gjs.Carousels(
    document.querySelector('.carousel-track'),
    document.querySelectorAll('.carousel-track li'),
    document.querySelector('.prev'),
    document.querySelector('.next'),
    document.querySelectorAll('.dots i'),
    'active',
    4000,
    false // isAuto defaults to true when omitted
);
carousel.stop();
carousel.autoPlay();  // idempotent
carousel.destroy();

const record = new gjs.xqRecord();
record.start('video', '#preview').then(() => { /* MediaRecorder is live */ });
record.stop();     // stops recording, then the blob is assigned to the media element
record.stopSet();
```

All four keep a handle on the listeners they add, so `destroy()` actually removes them instead
of leaving closures attached to `window` and `document`.

### Components

`lib/loading` shows a full-screen spinner and `lib/mourn` greys the page out on memorial days.
Both read their options from `data-*` attributes on their own `<script>` tag, neither needs an
`id`, and both expose a small API on `window`.

```html
<link rel="stylesheet" href="./lib/loading/css/loading.min.css">
<script src="./lib/loading/js/loading.min.js" data-color="#00e5ff" data-hide="load"></script>
<script>
    window.xqLoading.hide();
    window.xqLoading.show();
    window.xqLoading.get();      // the overlay element, if mounted
    window.xqLoading.mount();    // mount manually (e.g. with data-auto="false")
</script>
```

```html
<script src="./lib/mourn/mourn.min.js" data-date="5.12" data-src="/mourn.json"></script>
<script>
    window.xqMourn.list();        // merged date list, 'M.D' form
    window.xqMourn.check(['7.7']);// pass a list, or omit it to use the merged list
    window.xqMourn.load();        // fetch the remote list, resolves with a boolean
</script>
```

- `data-hide`: `load` (default, hide on `window.load`), `dom` (hide on `DOMContentLoaded`),
  `none` (keep it until you call `xqLoading.hide()`)
- `data-auto="false"`: skip the automatic mount, leaving only `window.xqLoading`
- `data-color`: ring colour; omitted means the stylesheet's colour is used
- `data-img`: optional icon URL — no `<img>` is rendered when it is absent
- `data-date` / `data-src`: extra dates / an override for the remote date list
- `mourn` only touches `html.style.filter` and `html.classList`, so other inline styles survive
- `mourn`'s remote fetch has an 8s timeout and a `catch`, so an offline page still renders

## Development

```bash
npm install
npm run serve        # serves the repo at http://127.0.0.1:4001, opens test/index.html
npm test             # consistency + unit + types + pack checks
```

| Script             | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| `npm run build`    | Regenerates the five minified artifacts with esbuild                |
| `npm run sync`     | Regenerates `lib/xqgjs-esm.js` from `lib/xqgjs.js`                   |
| `npm run check`    | Verifies ESM parity, cross-file consistency and byte-identical mins  |
| `npm run test:unit`| Runs the behaviour suite against the shipped files in a stub DOM     |
| `npm run check:types` | Compiles the CJS / ESM / global type usages                      |
| `npm run check:pack`  | Asserts `npm pack` contains only shippable files                  |
| `npm run serve`    | Zero-dependency static server for the manual pages                   |
| `npm run check:browser` | Opens every test page in a real browser and asserts the in-page suite passed — needs a local Playwright, and says so instead of failing when there is none |

Source of truth is `lib/xqgjs.js`. `lib/xqgjs-esm.js` is generated from it by
`scripts/sync-esm.js`, and the `.min.*` files are generated by `scripts/build.js`. Edit the
readable source, then run `npm run sync && npm run build`; never edit the minified files or the
ESM copy by hand.

Every page under `test/` runs its own assertions and prints PASS/FAIL in the page. Open
`test/index.html` after `npm run serve`, or let `npm run check:browser` drive them.

## Ask questions

[Open an issue](https://github.com/gitguanqi/xqgjs/issues/new)

## Author

[@gitguanqi](https://github.com/gitguanqi)

## License

MIT

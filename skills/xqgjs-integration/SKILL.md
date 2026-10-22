---
name: xqgjs-integration
description: Integrate xqgjs, a jQuery-like browser helper library, into a page or a bundled app - pick the right entry point, mount the loading and mourn components, use the DOM, storage, cookie and XHR helpers correctly, and drive widget lifecycle. Load when adding xqgjs to plain HTML, Vite/webpack, or a TypeScript project, or when a helper, widget or component from this package misbehaves.
---

# xqgjs integration

One object (`gjs`, aliased as `$g` in the browser) with DOM helpers, validators, storage,
cookies, XHR/JSONP, timers, file utilities and four widgets. Two components (`loading`,
`mourn`) ship as separate side-effectful entry points. Nothing here has a runtime dependency.

## 1. Choose the entry point first

| Target | Entry | What you get |
| --- | --- | --- |
| Plain HTML, CMS, no build step | `xqgjs/min` (or the CDN URL in `llms.txt`) | UMD; `window.gjs` and `window.$g`, plus AMD and CJS branches |
| Vite / webpack / rollup | `import gjs from 'xqgjs'` | `lib/xqgjs-esm.js` + `lib/xqgjs-esm.d.mts` |
| CommonJS, Jest, Node scripts | `require('xqgjs')` | `lib/xqgjs.js` + `lib/xqgjs.d.ts` |
| Loading overlay | `xqgjs/loading` + `xqgjs/loading/css/loading.css` | `window.xqLoading`, mounts on load |
| Memorial grey-out | `xqgjs/mourn` | `window.xqMourn`, fetches its date list on load |

Rules that follow from the packaging:

- The ESM build never touches `window`; only the UMD build sets the globals. Do not rely on a
  global with a bundler.
- `xqgjs/loading` and `xqgjs/mourn` are the only side-effectful entries, and they are listed in
  `sideEffects`. Importing them in a bundled app works, but they still need their `<script>` `data-*`
  attributes to be configured — in a bundle, pass options to `window.xqLoading(...)` /
  `window.xqMourn.check(...)` instead of relying on the tag.
- Minified CSS is not re-exported under the `./loading` specifier; use
  `xqgjs/lib/loading/css/loading.min.css`.
- There is no per-function subpath: importing `gjs` pulls in the whole object. Keep it out of
  server bundles.

## 2. Order of operations

1. Install: `npm install xqgjs` (browser-only; there is nothing to compile).
2. If the loading overlay is used, load its stylesheet **before** the script so the first paint is
   not an unstyled div.
3. Load the component script tag with its `data-*` options. It mounts itself; no init call.
4. Put application code inside `gjs.ready(...)`, which runs immediately when the document is
   already parsed and on `DOMContentLoaded` otherwise.
5. On teardown (SPA route change, hot reload) call `destroy()` on every widget instance and
   `window.xqLoading.hide()` — the widgets hold references to `window` / `document` listeners.

## 3. Constraints that change the code

- **One element per wrapper.** `gjs('#x')` wraps the first match only; `length` is `0` or `1`.
  Iterate collections with `gjs.each(gjs.domAll(...), (i, el) => ...)`, not with a wrapper.
- **`gjs.http` sends `data` verbatim.** Build the string yourself
  (`new URLSearchParams({...}).toString()`), the `Content-Type` is always
  `application/x-www-form-urlencoded`, every `2xx` resolves, and failures reject with a plain
  object `{code, msg, data}` — `msg` is the stable identifier (`get_fail`, `parse_fail`,
  `network_error`, …). A non-JSON body rejects with `parse_fail` and keeps the text in
  `data.raw`.
- **`gjs.httpSimple` is callback-only.** It returns `undefined`; success is `code === 200`,
  failure is `code === 101`.
- **`gjs.jsonp` appends `callback=<name>`** and expects that global function to exist already.
  It returns the `<script>` tag, or `null` for an invalid URL.
- **Storage and cookies report failures instead of throwing.** Setters return `false` when the
  browser blocks storage, getters return `null` / `''`. Only strings are stored — serialise
  objects yourself.
- **`gjs.copyText` needs a user gesture**, and the clipboard path also needs a secure context;
  otherwise the textarea fallback runs. It resolves `false` rather than rejecting.
- **`gjs.importFile` needs a global `XLSX`** (SheetJS) and an `<input type="file">` with a
  selected file. Without a `targetId` it writes into `#demo`; pass `null`-ish only if that element
  exists or the write is harmless.
- **`gjs.xqRecord` needs a secure context** plus `getUserMedia` and `MediaRecorder`. `start()`
  resolves `null` when the permission is denied instead of rejecting, so check the result before
  calling `stop()`.
- **Component options come from `document.currentScript`.** A `<script>` injected by
  `innerHTML`, `eval` or a bundler's dynamic import has no dataset to read; configure those
  through the `window.*` API instead.
- **`mourn` fetches a remote list by default.** A strict `connect-src` CSP turns that into a
  silently ignored failure (the built-in list still applies); set `data-src` to a same-origin
  file to keep it working.
- **No IE, no polyfills.** Output is ES2017. `gjs.isIE()` / `gjs.checkIeVersion()` are probes for
  telemetry, not compatibility switches.

## 4. Verification

- Confirm the library object exists before anything else: `window.gjs` for a script tag, or the
  default import's `.info.version` matching `package.json`.
- In a browser, open the repository's own pages (`npm run serve`, then `test/index.html`); each
  page prints PASS/FAIL.
- Run `npm run check` (build parity and consistency), `npm run test:unit` (behaviour suite against
  the shipped files) and `npm run check:pack` (tarball contents) after changing anything.
- A widget that keeps firing after navigation means `destroy()` was skipped; a spinner that never
  disappears means `data-hide` is `none` or `hide()` was never called.

## References

- `references/api.md` — every method with signature, default and return value.
- `references/components.md` — `loading` / `mourn` attributes, CSS classes, `window` API and
  lifecycle.

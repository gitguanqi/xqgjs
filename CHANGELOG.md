# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-10-22

Documentation and packaging only — no runtime change, no export renamed, no entry point moved.

### Added

- `llms.txt` at the package root, wired through `"llms"` in `package.json`: one compact document
  with the install and import forms, every public method, the entry-point table, the option
  defaults and the browser constraints.
- `skills/xqgjs-integration/SKILL.md`, wired through `"agents"`: entry-point selection, mount
  order, widget teardown and the failure modes that are easy to get wrong (`http` needs a
  pre-encoded body, `importFile` needs the `XLSX` global, `copyText` needs a user gesture, the
  components read their options from `document.currentScript`).
- `skills/xqgjs-integration/references/api.md` and `references/components.md` for the full method
  tables and the `loading` / `mourn` contract.
- `test/unit/agent-metadata.test.js`, part of `npm run test:unit`: it derives the public surface
  from `lib/xqgjs.js` and `lib/xqgjs-esm.d.mts` and fails when `llms.txt` misses a method, an
  entry point or a named type, when a `"llms"` / `"agents"` target is not shipped, when a skill
  reference is repository-only, or when a placeholder is left behind.
- `files` now ships `llms.txt` and `skills`, and `npm run check:pack` requires both in the tarball.

## [2.0.0] - 2026-10-20

This release fixes the load path, the build pipeline and a long list of runtime defects. The
public method names are unchanged — no `getnNavInfo`, `checkpassWord`, `dealy` or
`toggleBtnsStyle` was renamed — but behaviour changes in the places listed under
**Breaking changes**.

### Breaking changes

| Change | Before | After | Risk |
| --- | --- | --- | --- |
| `getLocal` / `getSession` on a missing key | the string `"null"` | `null` | high |
| `getLocal` / `getSession` values | double-encoded on read | decoded correctly | high — old values need clearing |
| `secondToTime` | `10 → '00:00:010'`, `600 → '00:010:00'` | `'00:00:10'`, `'00:10:00'` | high |
| `Carousels` `isAuto: false` | ignored, kept auto-playing | actually stops | medium |
| `Gjs.classList(elem, names)` | threw in strict mode, did nothing otherwise | replaces all class names | medium |
| `copyText` | returned `true` synchronously, showed an `alert` | returns `Promise<boolean>`, no alert | medium — needs a user gesture and a secure context for the clipboard path |
| `http` / `httpSimple` | only `200` counted as success; a non-JSON body threw `SyntaxError` | every `2xx` succeeds; new `parse_fail` / `network_error` codes | medium |
| `setCookie` | no default path | defaults to `path=/` | medium — the cookie is now visible to the whole site |
| `setTimeout` / `setInterval` | returned `undefined` | return the timer id | low |
| `importFile` | depended on `this` and hardcoded `#demo` | `importFile(obj, targetId = 'demo')`; no target means parse only | low |
| `Gjs.info.version` / `Gjs.info.date` | `v1.0.2` / two different dates in the two builds | `v2.0.0` / one date | low |
| `files` | shipped `test/` | ships `lib/` and the docs only | low |
| IE support | claimed in the docs | ES2017 output, no IE, no polyfills | low |

### Added

- `gjs.each(list, fn)` — arrays, `NodeList`s and plain objects; `return false` breaks the loop.
- `gjs.ready(fn)` — runs immediately when the document is already parsed.
- Instance helpers on every wrapper: `each`, `on`, `off`, `addCls`, `delCls`, `toggleCls`,
  `hasCls`.
- `gjs.checkPassword` as a correctly spelled alias of `checkpassWord`.
- `gjs.clearTime(id)` for the clock started by `gjs.getTime(elem)`.
- `gjs.Drag#destroy`, `gjs.Tab#destroy`, `gjs.Carousels#destroy` — every widget now unbinds the
  listeners it added.
- `window.xqLoading` with `hide`, `show`, `mount` and `get`.
- `window.xqMourn` with `check`, `load` and `list`.
- `data-auto="false"` for `loading`, `data-src` for `mourn`.
- TypeScript declarations: `lib/xqgjs.d.ts` (CommonJS + browser global) and
  `lib/xqgjs-esm.d.mts` (ESM), sharing `lib/types/xqgjs.d.ts`.
- `exports` map, `module`, `types`, `unpkg`, `jsdelivr`, `files`, `sideEffects`, `engines`.
- Build and verification tooling: `scripts/build.js`, `scripts/sync-esm.js`,
  `scripts/check-consistency.js`, `scripts/check-pack.js`, a zero-dependency `scripts/serve.js`
  and an optional `scripts/browser-check.js` that drives the pages in a real browser.
- A self-checking test suite under `test/`: 9 unit/contract suites that execute the *shipped*
  files, 13 browser pages that report PASS/FAIL in the page, and three type-usage fixtures.

### Fixed

- **The ESM build could not be imported at all.** `Gjs.extend` declared its loop variable
  implicitly, which is a `ReferenceError` under the strict mode ESM always runs in.
- **All eight validators threw `ReferenceError`** (`emailReg is not defined`, …). The rules live
  on `gjs.regAll`; they are now read through one guarded helper that also resets `lastIndex`.
- `gjs.getUrlArgs` threw on a URL without a query string, and on malformed percent-encoding.
- `xqRecord#stopSet` assigned a misspelled variable, so it threw in strict mode and never
  cleared `media`.
- The UMD header created `$g` as an implicit global; both globals are now assigned explicitly and
  the wrapper resolves the root through `globalThis`.
- `gjs.fn.css` returned from inside its loop, so only the first property was applied.
- `exportExcel` and `downloadFile` now revoke object URLs with the string URL, not the `Blob`.
- `gjs.getTime` used `getDay()` (day of week) as the day of the month.
- `gjs.Drag` no longer overwrites `window.onresize` or `document.onmousemove` / `onmouseup`;
  `Tab` no longer blanks `className`, so unrelated classes survive.
- `Carousels` stacked a new interval on every `mouseout`; `autoPlay()` is now idempotent.
- `http` / `httpSimple` built their XHR with an `||` chain that short-circuited on the first
  falsy constructor, and parsed JSON without a `try`/`catch`.
- Storage helpers no longer throw when storage is blocked; setters return `false`, getters `null`.
- `lib/loading` no longer requires `id="xqloading"` on its own script tag, no longer emits
  `border-left-color: undefined`, no longer renders an empty `<img>`, and no longer crashes when
  the tag sits in `<head>`.
- `lib/mourn` no longer requires an id, no longer replaces the whole `style` attribute on
  `<html>`, and no longer duplicates entries when merging the remote list. The fetch has an 8s
  timeout and a `catch`, so an offline page still renders.
- `setCookie`, `rmCookie` and `exportExcel` no longer write to the console when they reject an
  argument or a target; they report through their return value only.
- `test` script used to be `exit 1`; `test:browser` depended on a globally installed
  `live-server`.

### Changed

- Source of truth is `lib/xqgjs.js`. `lib/xqgjs-esm.js` is generated from it, and every
  `.min.*` file is generated by esbuild; `npm run check` fails on any drift.
- Repository line endings are pinned to LF by `.gitattributes` so the byte-level build check is
  stable across platforms.
- `package-lock.json` is committed; `esbuild` and `typescript` are pinned to exact versions.
- `README.md` and `zh.md` were rewritten: real API signatures, the ESM story, and the
  `npm run serve` workflow. The ES5 / IE claims were removed.

## [1.1.2] and earlier

Not tracked. The version in `package.json` was `1.1.2` while `gjs.info.version` reported
`v1.0.2`, and the two builds disagreed on the release date — one of the things 2.0.0 fixes.

[2.1.0]: https://github.com/gitguanqi/xqgjs/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/gitguanqi/xqgjs/compare/v1.1.2...v2.0.0

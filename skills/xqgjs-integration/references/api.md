# xqgjs API reference

Every runtime export of the shipped build. Signatures follow the TypeScript declarations in
`lib/types/xqgjs.d.ts`; behaviour follows `lib/xqgjs.js`. `gjs` is the default export in ESM,
`module.exports` in CommonJS and `window.gjs` / `window.$g` from a script tag.

## Entry object

| Member | Signature | Notes |
| --- | --- | --- |
| `gjs.info` | `{name: 'gjs', date: string, version: 'vX.Y.Z'}` | `version` mirrors `package.json` |
| `gjs.fn` | `GjsInstance & {init}` | wrapper prototype; add plugin methods here |
| `gjs.extend` | `(options) => target` | copies own keys to `gjs`, or to the instance when called on a wrapper |
| `gjs.each` | `(list, fn) => list` | arrays, array-likes, `NodeList`, plain objects; `false` breaks |
| `gjs.ready` | `(fn) => gjs` | `fn(gjs)`; immediate when the document is already parsed |

## Wrapper

`gjs(selector)` — selector string, `Element`, `null`, `undefined`. Always returns a wrapper:
`[0]: Element | null`, `length: 0 | 1`, `selector`. First match only.

| Method | Returns | Notes |
| --- | --- | --- |
| `setAttr(name, val)` | `this` | `setAttribute` |
| `getAttr(name)` | `string \| null` | |
| `delAttr(name)` | `this` | `removeAttribute` |
| `text(val)` | `this` | writes `innerText` |
| `html(val)` | `this` | writes `innerHTML` |
| `css(styleRules)` | `this` | assigns each key to `style[key]` |
| `each(fn)` | `this` | `fn(index, element)`; `false` breaks |
| `on(types, handler, capture?)` | `this` | space-separated event types |
| `off(types, handler, capture?)` | `this` | |
| `addCls(names)` / `delCls(names)` | `this` | string or array |
| `toggleCls(name, isAdd?)` | `this` | `isAdd` forces the direction |
| `hasCls(name)` | `boolean` | |

## DOM

| Member | Signature | Returns |
| --- | --- | --- |
| `cElem` | `(tagName: string)` | `Element` |
| `cText` | `(text: string)` | `Text` |
| `gId` | `(id: string)` | `HTMLElement \| null` |
| `gCls` | `(className: string)` | live `HTMLCollection` |
| `gTag` | `(tagName: string)` | live `HTMLCollection` |
| `gName` | `(name: string)` | `NodeList` |
| `dom` | `(selector: string)` | `Element \| null` |
| `domAll` | `(selector: string)` | `NodeList` |
| `addElem` | `(parent, child)` | `gjs` |
| `replaceElem` | `(parent, newElem, oldElem)` | `gjs` |
| `insertElem` | `(parent, newElem, refElem?)` | `gjs`; null/absent `refElem` appends |
| `cloneElem` | `(elem, isDeep = false)` | `Node \| null` |
| `delElem` | `(parent, child)` | `gjs` |
| `text` / `html` | `(elem, val)` | `gjs` |
| `setAttr` / `delAttr` | `(elem, name, val?)` | `gjs` |
| `getAttr` | `(elem, name)` | `string \| null` |

Traversal: `parent(n)` → `parentNode`; `parentElem(e)` → `parentElement`; `child(n)` →
`childNodes`; `childElem(e)` → `children`; `first(n)`, `last(n)`, `next(n)`, `prev(n)` and the
`*Elem` twins. All return `null` for a missing input.

## Style and class

| Member | Signature | Notes |
| --- | --- | --- |
| `css` | `(elem, styleRules)` | ignores a non-object after logging `TypeError` |
| `class` | `(elem, clsName)` | replaces `className` |
| `classList` | `(elem, names)` | replaces `className` from string/array |
| `addCls` / `delCls` | `(elem, names)` | several names may be space-separated |
| `toggleCls` | `(elem, name, isAdd?)` | |
| `hasCls` | `(elem, name)` | `boolean` |
| `indexCls` | `(elem, index)` | `classList.item(index) \| null` |

## Validation

`gjs.regAll` holds the patterns. Each validator returns `false` for a non-string, resets
`lastIndex`, and never throws.

`checkName` (Chinese, Latin, digits) · `checkUserName` (letter first, 5–16 word chars) ·
`checkNameTwo` (Latin, digits, `_`, `-`, 4–16) · `checkpassWord` / `checkPassword` (≥6 chars with
a digit, an uppercase, a lowercase and a symbol from `!@#$%^&*?`; a space counts) ·
`checkMobile` (permissive international form: optional `+` and country code, digits, spaces, `-` —
not the strict `1[34578]` mainland rule) · `checkPost` (3–12 letters/digits) · `checkEmail`
(`local@domain.tld`, 2–4 letter TLD) · `checkCardId` (mainland China 18-digit ID, valid province
prefix, `x`/`X` accepted).

## BOM, navigation, events

| Member | Signature | Notes |
| --- | --- | --- |
| `alert` | `(val)` | |
| `confirm` | `(val)` | `boolean` |
| `prompt` | `(val, tip?)` | `string \| null` |
| `setTimeout` / `setInterval` | `(fn, time?)` | return the timer id |
| `clearTimeout` / `clearInterval` | `(id)` | |
| `open` | `(url, target?, feature?, replaceRecord?)` | `window.open` |
| `close` / `reload` / `forward` / `back` | `()` | |
| `toUrl` | `(url)` | assigns `location.href` |
| `go` | `(num)` | `history.go` |
| `getnNavInfo` | `()` | `{appName, appVersion, appCodeName, platform, userAgent}` |
| `checkBrowserName` | `()` | `'Chrome' \| 'IE' \| 'Firefox' \| 'Opera' \| 'Safari' \| ''` |
| `checkIeVersion` | `()` | `'ie11' … 'ie7' \| 'NoIe'` |
| `getUrlArgs` | `(url?)` | `Record<string, string>`; `+` → space, `#` stripped |
| `supportDom` | `(name, version?)` | `hasFeature` |
| `isIE` | `()` | `ActiveXObject` sniff |
| `deviceType` | `()` | `'wap' \| 'pc'` |
| `fullScreen` | `(elem, eventType = 'click')` | binds the request handler, does not call it |
| `addEvent` / `removeEvent` | `(elem, type, handler, capture?)` | no-op on unsupported targets |
| `stop` | `(event)` | `stopPropagation` |
| `prevent` | `(event)` | `preventDefault` |

## Storage, cookies

| Member | Signature | Notes |
| --- | --- | --- |
| `setLocal` / `setSession` | `(name, value)` | `boolean`; `encodeURIComponent` on write |
| `getLocal` / `getSession` | `(name)` | `string \| null` |
| `rmLocal` / `rmSession` | `(name)` | `boolean` |
| `clearLocal` / `clearSession` | `()` | `boolean` |
| `setCookie` | `(name, value, maxAge?)` | `boolean`; `path=/` by default |
| `getCookie` | `(name, isAll?)` | `''` when absent; `true` returns all cookies |
| `rmCookie` | `(name)` | `boolean` |

## Network

| Member | Signature | Result |
| --- | --- | --- |
| `http` | `(method, url, data?)` | `Promise<{code, msg: 'get_succ', data: {info, data}}>`; rejects `{code, msg, data: {info, raw?}}` |
| `httpSimple` | `(method, url, data, cb)` | `undefined`; `cb({code, msg, data})`, `200` success / `101` failure |
| `jsonp` | `(url, callbackName, onError?)` | injected `<script>` or `null` |

`http` failure identifiers: `no_xhr`, `open_fail`, `send_fail`, `get_fail`, `parse_fail`,
`network_error`. Empty bodies resolve with `data.data === null`. The request is always
`application/x-www-form-urlencoded` and `data` is sent verbatim.

## Time

| Member | Signature | Notes |
| --- | --- | --- |
| `getTime` | `(elem)` | starts a 1s `YYYY-MM-DD HH:mm:ss` clock, returns the interval id or `null` |
| `clearTime` | `(id)` | |
| `secondToTime` | `(seconds)` | `'HH:mm:ss'` |

## Files

| Member | Signature | Notes |
| --- | --- | --- |
| `copyText` | `(idOrElement)` | `Promise<boolean>`; clipboard then textarea fallback |
| `exportExcel` | `(idOrElement, fileName)` | `boolean`; table HTML → `.xls` blob |
| `importFile` | `(input, targetId = 'demo')` | `Promise<rows>`; needs global `XLSX` |
| `fixdata` | `(arrayBuffer)` | binary string for `{type: 'binary'}` |
| `downloadFile` | `(url, name?)` | `Promise<string>` blob URL; rejects on non-ok |

## Widgets

| Member | Constructor | Instance |
| --- | --- | --- |
| `Drag` | `(elem)` | `elem`, `move(left, top)`, `cancel()`, `destroy()` |
| `Tab` | `(navs, contents, clsName = 'active', eventType = 'click')` | `destroy()` |
| `Carousels` | `(contents, contentLis, arrowLeft?, arrowRight?, btns?, active = 'active', dealy = 3000, isAuto = true, type = 'left')` | `num`, `isAuto`, `timer`, `move()`, `autoPlay()`, `stop()`, `toggleBtnsStyle()`, `destroy()` |
| `xqRecord` | `()` | `stream`, `media`, `start('audio' \| 'video', selector?)`, `stop()`, `stopSet(type?)` |

`Drag` throws for a missing element. `Carousels` measures `contentLis[0]` on construction, so the
items must be laid out before `new`. `xqRecord.start` resolves `null` when `getUserMedia` is
unavailable or denied; `stopSet()` without a type stops the video track.

# loading and mourn

Two independent, side-effectful components. They are not part of the main `gjs` object: each is a
standalone classic script that mounts itself on load and publishes a small API on `window`.

## loading

```html
<link rel="stylesheet" href="./node_modules/xqgjs/lib/loading/css/loading.min.css">
<script src="./node_modules/xqgjs/lib/loading/js/loading.min.js"
        data-color="#00e5ff"
        data-img="/logo.png"
        data-hide="load"></script>
```

### Attributes (read from the tag's own `dataset`)

| Attribute | Values | Default | Effect |
| --- | --- | --- | --- |
| `data-hide` | `load` \| `dom` \| `none` | `load` | `load`: hide on `window.load`; `dom`: hide on `DOMContentLoaded`; `none`: keep it until `hide()` |
| `data-auto` | `"false"` | mount | skips the automatic mount, leaving only `window.xqLoading` |
| `data-color` | CSS colour | stylesheet value | inline `border-left-color` on the ring |
| `data-img` | URL | none | icon inside the ring; no `<img>` is created when absent |

The script is located through `document.currentScript`, then `#xqloading`, then the last `<script>`
whose `src` contains `loading`. A tag injected via `innerHTML` or a dynamic import has no dataset —
use the API instead.

### API

| Call | Result |
| --- | --- |
| `window.xqLoading(img?, color?, {hide?, auto?}?)` | mounts (if needed) and returns the overlay element |
| `window.xqLoading.show()` | mounts when missing, removes the hiding classes, returns the element |
| `window.xqLoading.hide()` | adds `active` and `is-hidden`, returns the element or `null` |
| `window.xqLoading.mount(options?)` | mounts once; a second call returns the existing overlay |
| `window.xqLoading.get()` | the mounted overlay or `null` |

Calling `mount` twice never creates a duplicate: the existing `[data-xq-loading]` node is reused.
If the tag sits in `<head>`, the mount waits for `DOMContentLoaded` because `document.body` is not
there yet.

### Markup and styling

```html
<div class="loading" data-xq-loading>
    <div class="loading-inner">
        <span class="loading-circle" style="border-left-color: #00e5ff"></span>
        <img class="loading-img" src="/logo.png" alt="">
    </div>
</div>
```

- Hide by adding `.active` **or** `.is-hidden` to `.loading`; `.active` is kept for backwards
  compatibility.
- Override the look by targeting `.loading`, `.loading-inner`, `.loading-inner span` and
  `.loading-img`. The overlay is `position: fixed`, `z-index: 108` and 83% white.
- The stylesheet is required: without it the overlay renders as unstyled markup that hides the
  page.

### Lifecycle

Mount once per document. In an SPA, call `hide()` when the first view is ready and `show()`
before a route transition; the element stays in the DOM, so nothing is re-created and the
`donut-spin` animation restarts on `show()`.

## mourn

```html
<script src="./node_modules/xqgjs/lib/mourn/mourn.min.js"
        data-date="5.12,7.7"
        data-src="/mourn.json"></script>
```

| Attribute | Default | Effect |
| --- | --- | --- |
| `data-date` | none | extra dates in `M.D` form, comma separated, merged with `7.7` and the remote list |
| `data-src` | `https://xqgj.cc/data/store/mourn.json` | alternate JSON source (array of `"M.D"` strings) |

### API

| Call | Result |
| --- | --- |
| `window.xqMourn.check(dates?)` | `boolean`; applies the effect for today, using `dates` when given, else the merged list |
| `window.xqMourn.load()` | `Promise<boolean>`; fetches the remote list, merges, re-checks |
| `window.xqMourn.list()` | copy of the merged date list |

The script calls `load()` immediately on load, so no manual call is needed for the common case.

### Effect and safety

- Active: `documentElement.style.filter = 'grayscale(100%)'` and class `xq-mourn`.
- Inactive: clears only `filter` and removes `xq-mourn`; other inline styles on `<html>` survive.
- Dates compare as `month.date` without leading zeros (`5.12`, `7.7`).
- The fetch has an 8s `AbortController` timeout and a `catch`, so an offline page or a
  `connect-src` CSP block still renders — only the remote list is skipped.
- Values that are not strings or numbers (objects, nested junk) are ignored instead of producing
  `[object Object]` dates.

### Custom date list

```json
["7.7", "5.12", "12.13"]
```

Same-origin file recommended: it keeps the feature working under a strict CSP and removes a
third-party request from the critical path.

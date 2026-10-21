'use strict';

/**
 * Loads the real committed builds and hands back the library object.
 *
 * UMD runs inside a `vm` context so a strict-mode pass can be run against the same bytes the
 * browser gets. ESM is imported from disk through a `data:` URL, which is still the real file
 * (not a transpiled copy) but needs no `--experimental-vm-modules` flag.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createEnv } = require('./dom');

const ROOT = path.resolve(__dirname, '..', '..', '..');

const UMD_READABLE = 'lib/xqgjs.js';
const UMD_MIN = 'lib/xqgjs.min.js';
const ESM_READABLE = 'lib/xqgjs-esm.js';
const ESM_MIN = 'lib/xqgjs-esm.min.js';

function absolute(relative) {
    return path.join(ROOT, relative);
}

function read(relative) {
    return fs.readFileSync(absolute(relative), 'utf8');
}

/**
 * @param {string} relative path inside the repository
 * @param {{strict?: boolean, env?: object, beforeRun?: (env) => void}} options
 */
function loadUMD(relative, options) {
    options = options || {};
    const env = options.env || createEnv(options);
    const sandbox = env.window;

    // make `window`, `self` and `globalThis` the same object so the UMD factory's `root`
    // assignment and a `window.gjs` lookup cannot disagree
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.document = env.document;

    vm.createContext(sandbox);

    if (typeof options.beforeRun === 'function') options.beforeRun(env, sandbox);

    const source = read(relative);
    const code = options.strict ? '"use strict";\n' + source : source;
    vm.runInContext(code, sandbox, { filename: absolute(relative) });

    return { gjs: sandbox.gjs, env, sandbox };
}

/**
 * Imports a build as a real ES module.
 *
 * The module captures `window` at evaluation time, so the globals are installed before the
 * import and left in place for the rest of the process: `downloadFile` and `exportExcel`
 * resolve `fetch` / `Blob` from the global scope on every call.
 */
let esmSequence = 0;

async function loadESM(relative) {
    const env = createEnv();
    const win = env.window;
    win.window = win;
    win.self = win;

    const bind = (name, value) => {
        Object.defineProperty(globalThis, name, {
            value,
            configurable: true,
            writable: true
        });
    };

    bind('window', win);
    bind('document', env.document);
    bind('navigator', win.navigator);
    bind('fetch', win.fetch);
    bind('Blob', win.Blob);
    bind('XMLHttpRequest', win.XMLHttpRequest);
    bind('MediaRecorder', win.MediaRecorder);
    bind('FileReader', win.FileReader);

    esmSequence += 1;
    // A data: URL keeps Node from warning that a .js file in a CommonJS package contains ESM
    // syntax, and it still evaluates the file's real bytes. The trailing comment only busts
    // the module cache, because the module captured the globals at evaluation time.
    const source = read(relative);
    const specifier = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source) +
        '\n//# xqgjs-load=' + esmSequence;

    const module = await import(specifier);
    return { gjs: module.default, module, env };
}

module.exports = {
    ROOT,
    UMD_READABLE,
    UMD_MIN,
    ESM_READABLE,
    ESM_MIN,
    absolute,
    read,
    loadUMD,
    loadESM
};

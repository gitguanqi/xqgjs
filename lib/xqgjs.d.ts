/**
 * CommonJS entry declaration, also exposed as the browser global `gjs`.
 *
 *   const gjs = require('xqgjs');
 *   <script src="lib/xqgjs.js"></script>  ->  window.gjs / window.$g
 */

import type { GjsStatic } from './types/xqgjs';

declare const Gjs: GjsStatic;

export = Gjs;
export as namespace gjs;

declare global {
    const $g: GjsStatic;
    interface Window {
        gjs: GjsStatic;
        $g: GjsStatic;
    }
}

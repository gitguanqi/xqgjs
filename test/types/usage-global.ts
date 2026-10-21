// Global consumption: loading the UMD build with a <script> tag exposes `gjs` and `$g`.
// This file intentionally has no import/export, so it stays a global script and resolves the
// UMD namespace declared by `export as namespace gjs`.
/// <reference path="../../lib/xqgjs.d.ts" />

const info = gjs.info;
const version: string = info.version;

const box = $g('#app');
box.addCls('is-ready');
const ready: boolean = box.hasCls('is-ready');

window.gjs.checkMobile('13800138000');
window.$g.secondToTime(60);

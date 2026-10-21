/**
 * ESM entry declaration.
 *
 *   import gjs from 'xqgjs';
 *
 * The ESM build never touches `window`, so no global augmentation is declared here.
 */

import type { GjsStatic } from './types/xqgjs.js';

declare const Gjs: GjsStatic;

export default Gjs;

export type {
    GjsStatic,
    GjsInstance,
    GjsInfo,
    GjsSelector,
    DragInstance,
    TabInstance,
    CarouselsInstance,
    XqRecordInstance,
    HttpSuccess,
    HttpFailure
} from './types/xqgjs.js';

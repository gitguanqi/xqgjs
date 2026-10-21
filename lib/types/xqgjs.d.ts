/**
 * Shared types for xqgjs.
 *
 * This file is imported by both entry declarations:
 *   lib/xqgjs.d.ts      -> `export = Gjs`  (CommonJS and the browser global `gjs`)
 *   lib/xqgjs-esm.d.ts  -> `export default`
 *
 * It deliberately contains neither, because a single file cannot be both without forcing
 * `esModuleInterop` on every consumer.
 */

export type GjsSelector = string | Element | null | undefined;

export interface GjsInfo {
    name: string;
    date: string;
    version: string;
}

export interface HttpSuccess<T> {
    code: number;
    msg: 'get_succ';
    data: {
        info: string;
        data: T;
    };
}

export interface HttpFailure {
    code: number;
    msg: 'get_fail' | 'parse_fail' | 'network_error' | 'no_xhr' | 'open_fail' | 'send_fail';
    data: {
        info: string;
        raw?: string;
    };
}

export interface GjsInstance {
    0: Element | null;
    length: number;
    selector: GjsSelector;

    setAttr(name: string, val: string): this;
    getAttr(name: string): string | null;
    delAttr(name: string): this;

    text(val: string): this;
    html(val: string): this;
    css(styleRules: Partial<CSSStyleDeclaration> | Record<string, string | number>): this;

    each(fn: (index: number, elem: Element) => void | boolean): this;

    on(eventTypes: string, handleEvent: EventListener, isCapture?: boolean): this;
    off(eventTypes: string, handleEvent: EventListener, isCapture?: boolean): this;

    addCls(clsName: string | string[]): this;
    delCls(clsName: string | string[]): this;
    toggleCls(clsName: string, isAdd?: boolean): this;
    hasCls(clsName: string): boolean;
}

export interface GjsInitConstructor {
    new (selector: GjsSelector): GjsInstance;
    (selector: GjsSelector): GjsInstance;
    prototype: GjsInstance;
}

export interface DragInstance {
    elem: Element | null;
    move(l: number, t: number): void;
    cancel(): void;
    destroy(): void;
}

export interface DragConstructor {
    new (elem: Element): DragInstance;
    prototype: DragInstance;
}

export interface TabInstance {
    destroy(): void;
}

export interface TabConstructor {
    new (
        navs: ArrayLike<Element>,
        contents: ArrayLike<Element>,
        clsName?: string,
        eventType?: string
    ): TabInstance;
    prototype: TabInstance;
}

export interface CarouselsInstance {
    num: number;
    isAuto: boolean;
    timer: unknown;
    move(): void;
    autoPlay(): void;
    stop(): void;
    toggleBtnsStyle(): void;
    destroy(): void;
}

export interface CarouselsConstructor {
    new (
        contents: Element,
        contentLis: ArrayLike<Element>,
        arrowLeft?: Element | null,
        arrowRight?: Element | null,
        btns?: ArrayLike<Element> | null,
        active?: string,
        dealy?: number,
        isAuto?: boolean,
        type?: 'left' | 'top'
    ): CarouselsInstance;
    prototype: CarouselsInstance;
}

export interface XqRecordInstance {
    stream: MediaStream | null;
    media: HTMLMediaElement | null;
    start(type: 'audio' | 'video', selector?: string): Promise<MediaRecorder | null>;
    stop(): void;
    stopSet(type: 'audio' | 'video'): void;
}

export interface XqRecordConstructor {
    new (): XqRecordInstance;
    prototype: XqRecordInstance;
}

export interface GjsStatic {
    (selector: GjsSelector): GjsInstance;

    info: GjsInfo;
    fn: GjsInstance & { init: GjsInitConstructor };
    prototype: GjsInstance;
    regAll: Record<string, RegExp>;

    each<T>(list: ArrayLike<T>, fn: (index: number, value: T) => void | boolean): ArrayLike<T>;
    each<T>(list: Record<string, T>, fn: (key: string, value: T) => void | boolean): Record<string, T>;
    ready(fn: (gjs: GjsStatic) => void): GjsStatic;
    extend<T extends object>(options: T): GjsStatic & T;

    // validation
    checkName(name: string): boolean;
    checkUserName(name: string): boolean;
    checkNameTwo(name: string): boolean;
    checkpassWord(name: string): boolean;
    /** Alias of the historical `checkpassWord`. */
    checkPassword(name: string): boolean;
    checkMobile(name: string): boolean;
    checkPost(name: string): boolean;
    checkEmail(name: string): boolean;
    checkCardId(name: string): boolean;

    // dom creation and lookup
    cElem(name: string): Element;
    cText(name: string): Text;
    gId(name: string): HTMLElement | null;
    gCls(name: string): HTMLCollectionOf<Element>;
    gTag(name: string): HTMLCollectionOf<Element>;
    gName(name: string): NodeListOf<Element>;
    dom(name: string): Element | null;
    domAll(name: string): NodeListOf<Element>;

    // dom mutation
    addElem(parent: Node, child: Node): GjsStatic;
    replaceElem(parent: Node, newElem: Node, oldElem: Node): GjsStatic;
    insertElem(parent: Node, newElem: Node, refElem?: Node | null): GjsStatic;
    cloneElem(elem: Node, isDeep?: boolean): Node | null;
    delElem(parent: Node, child: Node): GjsStatic;

    text(elem: Element | null, val: string): GjsStatic;
    html(elem: Element | null, val: string): GjsStatic;
    setAttr(elem: Element | null, name: string, val: string): GjsStatic;
    getAttr(elem: Element | null, name: string): string | null;
    delAttr(elem: Element | null, name: string): GjsStatic;

    // traversal
    parent(elem: Node | null): Node | null;
    parentElem(elem: Element | null): Element | null;
    child(elem: Node | null): NodeListOf<ChildNode> | null;
    childElem(elem: Element | null): HTMLCollection | null;
    first(elem: Node | null): ChildNode | null;
    firstElem(elem: Element | null): Element | null;
    last(elem: Node | null): ChildNode | null;
    lastElem(elem: Element | null): Element | null;
    next(elem: Node | null): ChildNode | null;
    nextElem(elem: Element | null): Element | null;
    prev(elem: Node | null): ChildNode | null;
    prevElem(elem: Element | null): Element | null;

    // style and class
    css(elem: Element | null, styleRules: Partial<CSSStyleDeclaration> | Record<string, string | number>): GjsStatic;
    class(elem: Element | null, clsName: string): GjsStatic;
    classList(elem: Element | null, classLs: string | string[]): GjsStatic;
    addCls(elem: Element | null, clsName: string | string[]): GjsStatic;
    delCls(elem: Element | null, clsName: string | string[]): GjsStatic;
    toggleCls(elem: Element | null, clsName: string, isAdd?: boolean): GjsStatic;
    hasCls(elem: Element | null, clsName: string): boolean;
    indexCls(elem: Element | null, index: number): string | null;

    // bom
    alert(val: string): void;
    confirm(val: string): boolean;
    prompt(val: string, tip?: string): string | null;

    setTimeout(fn: () => void, time?: number): number;
    clearTimeout(timer: number): void;
    setInterval(fn: () => void, time?: number): number;
    clearInterval(timer: number): void;

    open(url: string, target?: string, feature?: string, replaceRecord?: boolean): Window | null;
    close(): void;
    reload(): void;
    toUrl(url: string): void;
    forward(): void;
    back(): void;
    go(num: number): void;

    getnNavInfo(): Record<string, string | undefined>;
    checkBrowserName(): string;
    checkIeVersion(): string;

    // events
    addEvent(elem: EventTarget | null, eventType: string, handleEvent: EventListener, isCapture?: boolean): void;
    removeEvent(elem: EventTarget | null, eventType: string, handleEvent: EventListener, isCapture?: boolean): void;
    stop(e: Event): void;
    prevent(e: Event): void;
    unevent?(elem: EventTarget, eventType: string, handleEvent: EventListener): void;

    // storage
    setLocal(name: string, value: string): boolean;
    getLocal(name: string): string | null;
    rmLocal(name: string): boolean;
    clearLocal(): boolean;
    setSession(name: string, value: string): boolean;
    getSession(name: string): string | null;
    rmSession(name: string): boolean;
    clearSession(): boolean;

    // cookie
    setCookie(name: string, value: string, maxAge?: number): boolean;
    getCookie(name: string): string;
    getCookie(name: string, isAll: false): string;
    getCookie(name: string, isAll: true): Record<string, string>;
    rmCookie(name: string): boolean;

    // network
    http<T = unknown>(type: string, url: string, data?: string | null): Promise<HttpSuccess<T>>;
    httpSimple<T = unknown>(
        type: string,
        url: string,
        data: string | null,
        cb: (result: { code: number; msg: string; data: T | { info: string; raw?: string } }) => void
    ): void;
    jsonp(url: string, callback: string, onError?: (error: Error) => void): HTMLScriptElement | null;

    // time
    getTime(elem: Element | null): number | null;
    clearTime(timer: number): void;
    secondToTime(seconds: number): string;

    // misc
    fullScreen(elem: Element | null, eventType?: string): void;
    getUrlArgs(url?: string): Record<string, string>;
    supportDom(name: string, version?: string): boolean;
    isIE(): boolean;
    deviceType(): 'pc' | 'wap';
    copyText(id: string | Element): Promise<boolean>;
    exportExcel(id: string | Element, fileName: string): boolean;
    importFile(input: HTMLInputElement, targetId?: string | Element): Promise<unknown[]>;
    fixdata(data: ArrayBuffer): string;
    downloadFile(url: string, name?: string): Promise<string>;

    // components
    Drag: DragConstructor;
    Tab: TabConstructor;
    Carousels: CarouselsConstructor;
    xqRecord: XqRecordConstructor;
}

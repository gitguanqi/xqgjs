'use strict';

/**
 * A deliberately small DOM stub.
 *
 * It only implements the surface xqgjs touches, plus enough bookkeeping (listeners, timers,
 * object URLs, cookies) for a test to assert how the library used it. Layout is not simulated:
 * clientWidth/offsetWidth are plain numbers a test can set.
 */

let uid = 0;

function camel(name) {
    return name.replace(/-([a-z])/g, (match, chr) => chr.toUpperCase());
}

class ClassList {
    constructor(elem) {
        this.elem = elem;
    }

    get _set() {
        return this.elem._classes;
    }

    add() {
        for (const name of arguments) {
            if (name) this._set.add(String(name));
        }
        this.elem._syncClass();
    }

    remove() {
        for (const name of arguments) {
            this._set.delete(String(name));
        }
        this.elem._syncClass();
    }

    contains(name) {
        return this._set.has(String(name));
    }

    toggle(name, force) {
        const key = String(name);
        const has = this._set.has(key);
        const shouldAdd = force === undefined ? !has : !!force;
        if (shouldAdd) this._set.add(key);
        else this._set.delete(key);
        this.elem._syncClass();
        return shouldAdd;
    }

    item(index) {
        const list = Array.from(this._set);
        return index < list.length ? list[index] : null;
    }

    get length() {
        return this._set.size;
    }

    toString() {
        return Array.from(this._set).join(' ');
    }
}

class StubElement {
    constructor(tagName) {
        this.tagName = String(tagName || 'div').toUpperCase();
        this.nodeType = 1;
        this.uid = ++uid;
        this.children = [];
        this.childNodes = [];
        this.parentNode = null;
        this.attributes = new Map();
        this.dataset = {};
        this.style = {};
        this._classes = new Set();
        this.classList = new ClassList(this);
        this._listeners = [];
        this.innerHTML = '';
        this.innerText = '';
        this.textContent = '';
        this.clientWidth = 100;
        this.clientHeight = 100;
        this.offsetWidth = 100;
        this.offsetHeight = 100;
        this.offsetLeft = 0;
        this.offsetTop = 0;
        this.clicked = 0;
        this.selected = 0;
        this.value = '';
        this.src = '';
    }

    get className() {
        return Array.from(this._classes).join(' ');
    }

    set className(value) {
        this._classes = new Set(String(value || '').split(/\s+/).filter(Boolean));
        this._syncClass();
    }

    _syncClass() {
        if (this.attributes) this.attributes.set('class', Array.from(this._classes).join(' '));
    }

    get id() {
        return this.getAttribute('id') || '';
    }

    set id(value) {
        this.setAttribute('id', value);
    }

    get firstChild() {
        return this.childNodes[0] || null;
    }

    get lastChild() {
        return this.childNodes[this.childNodes.length - 1] || null;
    }

    get firstElementChild() {
        return this.children[0] || null;
    }

    get lastElementChild() {
        return this.children[this.children.length - 1] || null;
    }

    get nextSibling() {
        if (!this.parentNode) return null;
        const index = this.parentNode.childNodes.indexOf(this);
        return index === -1 ? null : this.parentNode.childNodes[index + 1] || null;
    }

    get previousSibling() {
        if (!this.parentNode) return null;
        const index = this.parentNode.childNodes.indexOf(this);
        return index <= 0 ? null : this.parentNode.childNodes[index - 1] || null;
    }

    get nextElementSibling() {
        if (!this.parentNode) return null;
        const index = this.parentNode.children.indexOf(this);
        return index === -1 ? null : this.parentNode.children[index + 1] || null;
    }

    get previousElementSibling() {
        if (!this.parentNode) return null;
        const index = this.parentNode.children.indexOf(this);
        return index <= 0 ? null : this.parentNode.children[index - 1] || null;
    }

    get parentElement() {
        return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
        if (name.indexOf('data-') === 0 && name.length > 5) {
            this.dataset[camel(name.slice(5))] = String(value);
        }
    }

    getAttribute(name) {
        return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    removeAttribute(name) {
        this.attributes.delete(name);
        if (name.indexOf('data-') === 0 && name.length > 5) {
            delete this.dataset[camel(name.slice(5))];
        }
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }

    appendChild(child) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        this.children.push(child);
        this.childNodes.push(child);
        child.parentNode = this;
        return child;
    }

    insertBefore(child, ref) {
        if (!ref) return this.appendChild(child);
        const index = this.childNodes.indexOf(ref);
        if (index === -1) return this.appendChild(child);
        this.childNodes.splice(index, 0, child);
        this.children.splice(this.children.indexOf(ref), 0, child);
        child.parentNode = this;
        return child;
    }

    removeChild(child) {
        const ci = this.childNodes.indexOf(child);
        if (ci !== -1) this.childNodes.splice(ci, 1);
        const ei = this.children.indexOf(child);
        if (ei !== -1) this.children.splice(ei, 1);
        child.parentNode = null;
        return child;
    }

    replaceChild(newChild, oldChild) {
        const index = this.childNodes.indexOf(oldChild);
        if (index === -1) return oldChild;
        this.childNodes[index] = newChild;
        const ei = this.children.indexOf(oldChild);
        if (ei !== -1) this.children[ei] = newChild;
        newChild.parentNode = this;
        oldChild.parentNode = null;
        return oldChild;
    }

    cloneNode(deep) {
        const copy = new StubElement(this.tagName);
        copy.className = this.className;
        for (const [key, value] of this.attributes) copy.setAttribute(key, value);
        if (deep) {
            for (const child of this.children) copy.appendChild(child.cloneNode(true));
        }
        return copy;
    }

    addEventListener(type, handler, capture) {
        if (typeof handler !== 'function') return;
        this._listeners.push({ type, handler, capture: !!capture });
    }

    removeEventListener(type, handler, capture) {
        this._listeners = this._listeners.filter((entry) =>
            !(entry.type === type && entry.handler === handler && entry.capture === !!capture));
    }

    listenerCount(type) {
        return this._listeners.filter((entry) => entry.type === type).length;
    }

    dispatch(type, props) {
        const event = Object.assign({
            type,
            target: this,
            currentTarget: this,
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
            stopPropagation() { this.stopped = true; }
        }, props || {});
        for (const entry of this._listeners.filter((item) => item.type === type)) {
            entry.handler.call(this, event);
        }
        return event;
    }

    click() {
        this.clicked += 1;
        this.dispatch('click');
    }

    select() {
        this.selected += 1;
    }

    getElementsByTagName(tag) {
        const wanted = String(tag).toUpperCase();
        const out = [];
        const walk = (node) => {
            for (const child of node.children) {
                if (wanted === '*' || child.tagName === wanted) out.push(child);
                walk(child);
            }
        };
        walk(this);
        return out;
    }

    getElementsByClassName(name) {
        const out = [];
        const walk = (node) => {
            for (const child of node.children) {
                if (child.classList.contains(name)) out.push(child);
                walk(child);
            }
        };
        walk(this);
        return out;
    }

    querySelectorAll(selector) {
        return this._match(selector);
    }

    querySelector(selector) {
        return this._match(selector)[0] || null;
    }

    _match(selector) {
        const list = String(selector || '').trim();
        if (!list) return [];
        const out = [];
        const walk = (node) => {
            for (const child of node.children) {
                if (matches(child, list)) out.push(child);
                walk(child);
            }
        };
        walk(this);
        return out;
    }
}

function matches(elem, selector) {
    const parts = selector.split(',').map((part) => part.trim()).filter(Boolean);
    return parts.some((part) => {
        if (part.charAt(0) === '#') return elem.getAttribute('id') === part.slice(1);
        if (part.charAt(0) === '.') return elem.classList.contains(part.slice(1));
        const attr = /^\[([\w-]+)\]$/.exec(part);
        if (attr) return elem.hasAttribute(attr[1]);
        const tagAttr = /^([\w-]+)?\[([\w-]+)\]$/.exec(part);
        if (tagAttr) {
            const tagOk = !tagAttr[1] || elem.tagName === tagAttr[1].toUpperCase();
            return tagOk && elem.hasAttribute(tagAttr[2]);
        }
        return elem.tagName === part.toUpperCase();
    });
}

class StubDocument {
    constructor() {
        this.nodeType = 9;
        this._elements = [];
        this._listeners = [];
        this.readyState = 'complete';
        this.currentScript = null;
        this._cookies = new Map();

        this.documentElement = new StubElement('html');
        this.head = new StubElement('head');
        this.body = new StubElement('body');
        this.documentElement.appendChild(this.head);
        this.documentElement.appendChild(this.body);

        this.implementation = {
            hasFeature() {
                return true;
            }
        };
    }

    _register(elem) {
        this._elements.push(elem);
        return elem;
    }

    createElement(tag) {
        return this._register(new StubElement(tag));
    }

    createTextNode(text) {
        return { nodeType: 3, textContent: String(text), parentNode: null };
    }

    getElementById(id) {
        return this._all().find((elem) => elem.getAttribute('id') === id) || null;
    }

    getElementsByTagName(tag) {
        return this._all().filter((elem) => String(tag) === '*' ||
            elem.tagName === String(tag).toUpperCase());
    }

    getElementsByClassName(name) {
        return this._all().filter((elem) => elem.classList.contains(name));
    }

    getElementsByName(name) {
        return this._all().filter((elem) => elem.getAttribute('name') === name);
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        return this._all().filter((elem) => matches(elem, selector));
    }

    _all() {
        const out = [];
        const seen = new Set();
        const walk = (node) => {
            if (!node || seen.has(node.uid)) return;
            seen.add(node.uid);
            for (const child of node.children) {
                out.push(child);
                walk(child);
            }
        };
        walk(this.documentElement);
        for (const elem of this._elements) {
            if (!seen.has(elem.uid) && elem !== this.documentElement) {
                out.push(elem);
                seen.add(elem.uid);
            }
        }
        return out;
    }

    addEventListener(type, handler, capture) {
        if (typeof handler !== 'function') return;
        this._listeners.push({ type, handler, capture: !!capture });
    }

    removeEventListener(type, handler, capture) {
        this._listeners = this._listeners.filter((entry) =>
            !(entry.type === type && entry.handler === handler && entry.capture === !!capture));
    }

    listenerCount(type) {
        return this._listeners.filter((entry) => entry.type === type).length;
    }

    dispatch(type, props) {
        const event = Object.assign({ type, target: this }, props || {});
        for (const entry of this._listeners.filter((item) => item.type === type)) {
            entry.handler.call(this, event);
        }
        return event;
    }

    execCommand() {
        return true;
    }

    get cookie() {
        return Array.from(this._cookies.entries()).map(([key, value]) => key + '=' + value).join('; ');
    }

    set cookie(text) {
        const parts = String(text).split(';');
        const pair = parts.shift() || '';
        const pos = pair.indexOf('=');
        if (pos === -1) return;
        const name = pair.slice(0, pos).trim();
        const value = pair.slice(pos + 1);
        let maxAge = null;
        for (const attr of parts) {
            const [key, raw] = attr.split('=');
            if (String(key).trim().toLowerCase() === 'max-age') maxAge = Number(raw);
        }
        if (maxAge !== null && maxAge <= 0) this._cookies.delete(name);
        else if (value !== '') this._cookies.set(name, value);
        else this._cookies.delete(name);
    }

    clearCookies() {
        this._cookies.clear();
    }
}

class StubStorage {
    constructor() {
        this.map = new Map();
        this.throwOnAccess = false;
    }

    setItem(key, value) {
        if (this.throwOnAccess) throw new Error('storage disabled');
        this.map.set(String(key), String(value));
    }

    getItem(key) {
        if (this.throwOnAccess) throw new Error('storage disabled');
        return this.map.has(String(key)) ? this.map.get(String(key)) : null;
    }

    removeItem(key) {
        this.map.delete(String(key));
    }

    clear() {
        this.map.clear();
    }
}

class StubXhr {
    constructor() {
        this.readyState = 0;
        this.status = 0;
        this.responseText = '';
        this.response = '';
        this.headers = {};
        this.method = null;
        this.url = null;
        this.sentBody = null;
        this.onreadystatechange = null;
        this.onerror = null;
        this._openThrows = false;
    }

    open(method, url) {
        if (this._openThrows) throw new Error('invalid url');
        this.method = method;
        this.url = url;
        this.readyState = 1;
    }

    setRequestHeader(name, value) {
        this.headers[name] = value;
    }

    send(body) {
        this.sentBody = body;
        this._sent = true;
    }

    respond(status, text) {
        this.status = status;
        this.responseText = text === undefined ? '' : String(text);
        this.response = this.responseText;
        this.readyState = 4;
        if (this.onreadystatechange) this.onreadystatechange();
    }

    failNetwork() {
        if (this.onerror) this.onerror();
    }
}

class StubFileReader {
    constructor() {
        this.onload = null;
        this.onerror = null;
        this.result = '';
    }

    readAsBinaryString(file) {
        this.result = (file && file.content) || '';
        if (this.onload) this.onload({ target: this });
    }

    readAsArrayBuffer(file) {
        this.result = (file && file.content) || '';
        if (this.onload) this.onload({ target: this });
    }

    readAsText(file) {
        this.result = (file && file.content) || '';
        if (this.onload) this.onload({ target: this });
    }
}

class StubMediaRecorder {
    constructor(stream, options) {
        this.stream = stream;
        this.options = options;
        this.mimeType = 'video/webm';
        this.ondataavailable = null;
        this.onstop = null;
        this.started = 0;
        this.stopped = 0;
    }

    start() {
        this.started += 1;
    }

    stop() {
        this.stopped += 1;
        if (this.onstop) this.onstop();
    }
}

function createEnv(options) {
    options = options || {};

    const document = new StubDocument();
    const timers = [];
    const objectUrls = [];
    const revokedUrls = [];
    const calls = { alert: [], confirm: [], prompt: [], open: [] };
    const logs = { info: [], warn: [], error: [], log: [] };

    let timerSeq = 0;
    let now = 0;

    // mutable hooks a test can drive (network responses, last XHR instance)
    const state = { fetchCalls: [], fetchImpl: null, lastXhr: null };

    function schedule(fn, delay, repeat) {
        timerSeq += 1;
        const id = timerSeq;
        timers.push({ id, fn, time: now + Math.max(0, Number(delay) || 0), repeat, delay: Math.max(0, Number(delay) || 0) });
        return id;
    }

    function clear(id) {
        const index = timers.findIndex((timer) => timer.id === id);
        if (index !== -1) timers.splice(index, 1);
    }

    function tick(ms) {
        const target = now + Math.max(0, Number(ms) || 0);
        let guard = 0;
        while (guard++ < 200) {
            const due = timers
                .filter((timer) => timer.time <= target)
                .sort((a, b) => a.time - b.time)[0];
            if (!due) break;
            now = due.time;
            clear(due.id);
            if (due.repeat) {
                due.time = now + (due.delay || 1);
                timers.push(due);
            }
            due.fn();
        }
        now = target;
    }

    const windowStub = {
        document,
        navigator: {
            userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
            appVersion: '5.0 (Windows)',
            appName: 'Netscape',
            appCodeName: 'Mozilla',
            platform: 'Win32',
            clipboard: {
                _text: null,
                writeText(text) {
                    this._text = text;
                    return Promise.resolve();
                }
            },
            mediaDevices: {
                getUserMedia(option) {
                    if (option && option.__reject) return Promise.reject(new Error('denied'));
                    return Promise.resolve({
                        __option: option,
                        audioStopped: 0,
                        videoStopped: 0,
                        getAudioTracks() {
                            const stream = this;
                            return [{ stop() { stream.audioStopped += 1; } }];
                        },
                        getVideoTracks() {
                            const stream = this;
                            return [{ stop() { stream.videoStopped += 1; } }];
                        }
                    });
                }
            }
        },
        location: { href: 'http://localhost/test/index.html', search: '', reloaded: 0, reload() { this.reloaded += 1; } },
        history: { forwarded: 0, backed: 0, went: [], forward() { this.forwarded += 1; }, back() { this.backed += 1; }, go(n) { this.went.push(n); } },
        localStorage: new StubStorage(),
        sessionStorage: new StubStorage(),
        alert(message) { calls.alert.push(message); },
        confirm(message) { calls.confirm.push(message); return true; },
        prompt(message, tip) { calls.prompt.push([message, tip]); return 'answer'; },
        open(...args) { calls.open.push(args); return { closed: false, close() { this.closed = true; } }; },
        close() { windowStub.closed = true; },
        setTimeout: (fn, delay) => schedule(fn, delay, false),
        clearTimeout: (id) => clear(id),
        setInterval: (fn, delay) => schedule(fn, delay, true),
        clearInterval: (id) => clear(id),
        addEventListener(type, handler, capture) { document.addEventListener('window:' + type, handler, capture); },
        removeEventListener(type, handler, capture) { document.removeEventListener('window:' + type, handler, capture); },
        dispatchWindow(type, props) { return document.dispatch('window:' + type, props); },
        URL: {
            createObjectURL(blob) {
                const url = 'blob:' + (objectUrls.length + 1);
                objectUrls.push({ url, blob });
                return url;
            },
            revokeObjectURL(url) {
                revokedUrls.push(url);
            }
        },
        Blob: class StubBlob {
            constructor(parts, opts) {
                this.parts = parts || [];
                this.type = (opts && opts.type) || '';
                this.size = String(this.parts.join('')).length;
            }
        },
        FileReader: StubFileReader,
        MediaRecorder: StubMediaRecorder,
        XMLHttpRequest: function XhrFactory() {
            const xhr = new StubXhr();
            state.lastXhr = xhr;
            return xhr;
        },
        fetch(url) {
            state.fetchCalls.push(url);
            if (state.fetchImpl) return state.fetchImpl(url);
            return Promise.resolve({
                ok: true,
                status: 200,
                blob: () => Promise.resolve(new windowStub.Blob(['stub'], { type: 'image/jpeg' })),
                json: () => Promise.resolve({})
            });
        },
        console: {
            info(...args) { logs.info.push(args); },
            log(...args) { logs.log.push(args); },
            warn(...args) { logs.warn.push(args); },
            error(...args) { logs.error.push(args); }
        },
        AbortController: globalThis.AbortController,
        closed: false
    };

    if (options.throwOnStorage) {
        windowStub.localStorage.throwOnAccess = true;
        windowStub.sessionStorage.throwOnAccess = true;
    }

    const env = {
        document,
        window: windowStub,
        self: windowStub,
        timers,
        tick,
        now: () => now,
        objectUrls,
        revokedUrls,
        calls,
        logs,
        state,
        get lastXhr() { return state.lastXhr; },
        get gjs() { return windowStub.gjs; }
    };

    // the UMD factory assigns to `root`, which resolves to globalThis; point window at the
    // same object so `window.gjs` and the bare `gjs` global agree
    windowStub.window = windowStub;
    windowStub.self = windowStub;

    return env;
}

module.exports = { createEnv, StubElement, StubDocument, matches };

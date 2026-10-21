'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUMD } = require('./helpers/sandbox');
const { createEnv } = require('./helpers/dom');
const { plain } = require('./helpers/plain');

function tick() {
    return new Promise((resolve) => setImmediate(resolve));
}

function today() {
    const now = new Date();
    return (now.getMonth() + 1) + '.' + now.getDate();
}

// ---------------------------------------------------------------- loading overlay

test('loading mounts without an id on its own script tag', () => {
    const env = createEnv();
    const script = env.document.createElement('script');
    script.setAttribute('data-img', 'logo.svg');
    script.setAttribute('data-color', '#00f');
    env.document.currentScript = script;
    env.document.readyState = 'loading';

    const { sandbox } = loadUMD('lib/loading/js/loading.js', { env });

    const overlay = env.document.querySelector('[data-xq-loading]');
    assert.ok(overlay, 'the overlay must be appended to body');
    assert.equal(overlay.getAttribute('class'), 'loading');
    assert.equal(overlay.querySelector('.loading-circle').style.borderLeftColor, '#00f');
    assert.equal(overlay.querySelector('.loading-img').src, 'logo.svg');
    assert.equal(typeof sandbox.xqLoading, 'function');
});

test('loading never writes an undefined colour', () => {
    const env = createEnv();
    env.document.currentScript = env.document.createElement('script');
    loadUMD('lib/loading/js/loading.js', { env });

    const overlay = env.document.querySelector('[data-xq-loading]');
    const circle = overlay.querySelector('.loading-circle');
    assert.equal(circle.style.borderLeftColor, undefined);
    assert.equal(String(overlay.innerHTML).includes('undefined'), false);
    assert.equal(overlay.getAttribute('class').includes('undefined'), false);
});

test('loading skips the image element when no image was configured', () => {
    const env = createEnv();
    env.document.currentScript = env.document.createElement('script');
    loadUMD('lib/loading/js/loading.js', { env });

    const overlay = env.document.querySelector('[data-xq-loading]');
    assert.equal(overlay.querySelector('.loading-img'), null);
    assert.equal(String(overlay.innerHTML).includes('src'), false, 'an empty src would request the page again');
});

test('loading hides on window load', () => {
    const env = createEnv();
    env.document.readyState = 'loading';
    env.document.currentScript = env.document.createElement('script');
    loadUMD('lib/loading/js/loading.js', { env });

    const overlay = env.document.querySelector('[data-xq-loading]');
    assert.equal(overlay.classList.contains('is-hidden'), false);

    env.document.dispatch('window:load');
    assert.equal(overlay.classList.contains('is-hidden'), true);
    assert.equal(overlay.classList.contains('active'), true, 'the legacy class stays for compatibility');
});

test('loading waits for body when the tag sits in head', () => {
    const env = createEnv();
    const body = env.document.body;
    env.document.body = null;
    env.document.readyState = 'loading';
    env.document.currentScript = env.document.createElement('script');

    assert.doesNotThrow(() => loadUMD('lib/loading/js/loading.js', { env }));
    assert.equal(env.document.querySelector('[data-xq-loading]'), null, 'nothing to append to yet');

    env.document.body = body;
    env.document.dispatch('DOMContentLoaded');
    assert.ok(env.document.querySelector('[data-xq-loading]'), 'it must mount once body exists');
});

test('loading mounts only once', () => {
    const env = createEnv();
    env.document.currentScript = env.document.createElement('script');
    const { sandbox } = loadUMD('lib/loading/js/loading.js', { env });

    sandbox.xqLoading('a.svg', '#f00');
    sandbox.xqLoading('b.svg', '#0f0');

    assert.equal(env.document.querySelectorAll('[data-xq-loading]').length, 1);
});

// ---------------------------------------------------------------- mourn

test('mourn tolerates a script tag with no id and no configuration', () => {
    const env = createEnv();
    env.state.fetchImpl = () => Promise.reject(new Error('offline'));
    assert.doesNotThrow(() => loadUMD('lib/mourn/mourn.js', { env }));
});

test('mourn deduplicates the date list and honours data-date', async () => {
    const env = createEnv();
    const script = env.document.createElement('script');
    script.setAttribute('data-src', '/mourn.json');
    script.setAttribute('data-date', '1.1,5.12');
    env.document.currentScript = script;
    env.state.fetchImpl = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(['13.32', '1.1'])
    });

    const { sandbox } = loadUMD('lib/mourn/mourn.js', { env });
    await tick();
    await tick();

    const list = sandbox.xqMourn.list();
    assert.ok(list.includes('7.7'), 'built-in date stays');
    assert.ok(list.includes('1.1'));
    assert.ok(list.includes('5.12'));
    assert.ok(list.includes('13.32'));
    assert.equal(list.length, new Set(list).size, 'no duplicates');
    assert.equal(list.filter((item) => item === '1.1').length, 1);
});

test('mourn greys the page on a matching date and clears it otherwise', async () => {
    const env = createEnv();
    const script = env.document.createElement('script');
    script.setAttribute('data-date', '1.1');
    env.document.currentScript = script;
    env.state.fetchImpl = () => Promise.reject(new Error('offline'));

    const { sandbox } = loadUMD('lib/mourn/mourn.js', { env });
    await tick();
    await tick();

    assert.equal(sandbox.xqMourn.check([today()]), true);
    assert.equal(env.document.documentElement.style.filter, 'grayscale(100%)');
    assert.equal(env.document.documentElement.classList.contains('xq-mourn'), true);

    assert.equal(sandbox.xqMourn.check(['13.32']), false);
    assert.equal(env.document.documentElement.style.filter, '');
    assert.equal(env.document.documentElement.classList.contains('xq-mourn'), false);
});

test('mourn does not wipe other inline styles on <html>', async () => {
    const env = createEnv();
    env.document.documentElement.style.background = 'red';
    env.document.currentScript = env.document.createElement('script');
    env.state.fetchImpl = () => Promise.reject(new Error('offline'));

    const { sandbox } = loadUMD('lib/mourn/mourn.js', { env });
    await tick();
    await tick();

    sandbox.xqMourn.check([today()]);
    assert.equal(env.document.documentElement.style.background, 'red', 'only filter may be touched');
});

// ---------------------------------------------------------------- record

test('xqRecord clears its state without touching an undeclared variable', async () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env, strict: true });
    const audio = env.document.createElement('audio');
    env.document.body.appendChild(audio);

    const record = new gjs.xqRecord();
    await record.start('audio');
    assert.ok(record.mediaRecorder, 'recorder should be running');
    assert.ok(record.media, 'the audio element should be resolved');

    assert.doesNotThrow(() => record.stop());
    assert.equal(record.stream, null);
    assert.equal(record.mediaRecorder, null);
    assert.equal(record.media, null);
    assert.equal(record.chunks.length, 0);
});

test('xqRecord.stopSet releases the right track', () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    const record = new gjs.xqRecord();

    const stream = {
        audioStopped: 0,
        videoStopped: 0,
        getAudioTracks() {
            const self = this;
            return [{ stop() { self.audioStopped += 1; } }];
        },
        getVideoTracks() {
            const self = this;
            return [{ stop() { self.videoStopped += 1; } }];
        }
    };
    record.stream = stream;
    record.media = env.document.createElement('audio');

    record.stopSet('audio');
    assert.equal(stream.audioStopped, 1);
    assert.equal(stream.videoStopped, 0);
    assert.equal(record.media, null);
});

// ---------------------------------------------------------------- files

test('downloadFile revokes the object URL string, not the blob', async () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    env.state.fetchImpl = () => Promise.resolve({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new env.window.Blob(['image'], { type: 'image/jpeg' }))
    });

    const before = env.document.body.children.length;
    const objectUrl = await gjs.downloadFile('/img/dlam.jpg', 'saved.jpg');

    assert.equal(typeof objectUrl, 'string');
    assert.equal(env.document.body.children.length, before, 'the temporary anchor must be removed');

    env.tick(0);
    assert.deepEqual(env.revokedUrls, [objectUrl]);
    assert.equal(typeof env.revokedUrls[0], 'string');
    assert.ok(!(env.revokedUrls[0] instanceof env.window.Blob), 'revoking a Blob leaks the URL');
});

test('downloadFile derives a default file name from the url', async () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    env.state.fetchImpl = () => Promise.resolve({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new env.window.Blob(['x']))
    });

    const created = [];
    const originalCreate = env.document.createElement.bind(env.document);
    env.document.createElement = (tag) => {
        const elem = originalCreate(tag);
        if (String(tag).toLowerCase() === 'a') created.push(elem);
        return elem;
    };

    await gjs.downloadFile('/files/report.pdf?token=1');
    assert.equal(created[0].download, 'xqgjs-report.pdf');
});

test('exportExcel downloads and cleans up its object URL', () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    const table = env.document.createElement('div');
    table.id = 'myDiv';
    table.innerHTML = '<table><tr><td>1</td></tr></table>';
    env.document.body.appendChild(table);

    assert.equal(gjs.exportExcel('myDiv', 'x.xls'), true);
    assert.equal(env.objectUrls.length, 1);
    assert.equal(env.document.body.children.includes(table), true);

    env.tick(0);
    assert.equal(env.revokedUrls.length, 1);
});

test('exportExcel reports a missing target instead of throwing', () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    assert.equal(gjs.exportExcel('nope', 'x.xls'), false);
    // the return value is the contract; a failed lookup must not also write to the console
    assert.equal(env.logs.error.length, 0);
});

test('importFile resolves rows and writes them to the requested target', async () => {
    const env = createEnv();
    const { gjs, sandbox } = loadUMD('lib/xqgjs.js', { env });
    sandbox.XLSX = {
        read: () => ({ SheetNames: ['s1'], Sheets: { s1: {} } }),
        utils: { sheet_to_json: () => [{ name: 'a' }] }
    };

    const target = env.document.createElement('div');
    target.id = 'output';
    env.document.body.appendChild(target);

    const input = env.document.createElement('input');
    input.files = [{ content: 'binary-data' }];

    const rows = await gjs.importFile(input, 'output');
    assert.deepEqual(plain(rows), [{ name: 'a' }]);
    assert.equal(target.innerHTML, '[{"name":"a"}]');
});

test('importFile defaults to #demo and survives without it', async () => {
    const env = createEnv();
    const { gjs, sandbox } = loadUMD('lib/xqgjs.js', { env });
    sandbox.XLSX = {
        read: () => ({ SheetNames: ['s1'], Sheets: { s1: {} } }),
        utils: { sheet_to_json: () => [{ ok: 1 }] }
    };

    const input = env.document.createElement('input');
    input.files = [{ content: 'x' }];

    await assert.doesNotReject(gjs.importFile(input));

    const demo = env.document.createElement('div');
    demo.id = 'demo';
    env.document.body.appendChild(demo);
    await gjs.importFile(input);
    assert.equal(demo.innerHTML, '[{"ok":1}]');
});

test('importFile rejects clearly when XLSX is missing', async () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    const input = env.document.createElement('input');
    input.files = [{ content: 'x' }];
    await assert.rejects(gjs.importFile(input), /XLSX/);
});

test('copyText uses the clipboard API when it exists', async () => {
    const env = createEnv();
    const { gjs } = loadUMD('lib/xqgjs.js', { env });
    const div = env.document.createElement('div');
    div.id = 'copy';
    div.innerText = '复制我';
    env.document.body.appendChild(div);

    assert.equal(await gjs.copyText('copy'), true);
    assert.equal(env.window.navigator.clipboard._text, '复制我');
    assert.equal(env.calls.alert.length, 0, 'copyText must not pop an alert');
});

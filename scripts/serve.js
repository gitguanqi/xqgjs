#!/usr/bin/env node
/**
 * Dependency-free static server for the manual test pages.
 *
 * It replaces the previous `live-server` global, which made `npm run test:browser` fail on a
 * machine that had never installed it globally. It also serves the /fixtures/* endpoints the
 * test pages need, so the suite runs with no network access.
 *
 * Usage:
 *   node scripts/serve.js            # http://localhost:4001/test/index.html
 *   PORT=5000 node scripts/serve.js
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 4001);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.xls': 'application/vnd.ms-excel',
    '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, type) {
    const payload = body === undefined || body === null ? '' : body;
    const size = Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(String(payload));
    res.writeHead(status, {
        'Content-Type': type || 'text/plain; charset=utf-8',
        // Without a length the browser reports a HEAD fetch as ERR_ABORTED even though the
        // status line was fine, which makes the index page look broken in devtools.
        'Content-Length': size,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
    });
    // Node drops the body for a HEAD request on its own.
    res.end(payload);
}

function sendJson(res, status, value) {
    send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

function readBody(req) {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => resolve(raw));
        req.on('error', () => resolve(''));
    });
}

function serveFixtures(req, res, pathname, searchParams) {
    if (pathname === '/fixtures/echo') {
        readBody(req).then((body) => {
            sendJson(res, 200, { method: req.method, body, ok: true });
        });
        return true;
    }
    if (pathname === '/fixtures/notjson.txt') {
        send(res, 200, 'not-json', 'text/plain; charset=utf-8');
        return true;
    }
    if (pathname === '/fixtures/data.json') {
        sendJson(res, 200, { ok: true, items: [1, 2, 3] });
        return true;
    }
    if (pathname === '/fixtures/jsonp.js') {
        // Real JSONP: the page must be able to call it back, not just build the URL.
        const callback = searchParams.get('callback') || 'callback';
        send(res, 200, callback + '(' + JSON.stringify({ ok: true, items: [1, 2, 3] }) + ');',
            'text/javascript; charset=utf-8');
        return true;
    }
    if (pathname === '/fixtures/mourn.json') {
        // A date that can never match, so the network path is exercised without the page
        // going grayscale behind the tester's back.
        sendJson(res, 200, ['13.32']);
        return true;
    }
    if (pathname === '/fixtures/slow') {
        const ms = Math.min(Number(searchParams.get('ms') || 200), 5000);
        setTimeout(() => sendJson(res, 200, { ok: true, waited: ms }), ms);
        return true;
    }
    if (pathname === '/fixtures/404') {
        sendJson(res, 404, { ok: false, error: 'not_found' });
        return true;
    }
    return false;
}

function resolveTarget(pathname) {
    const decoded = decodeURIComponent(pathname);
    const candidate = path.resolve(ROOT, '.' + decoded);
    if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) return null;
    if (candidate.split(path.sep).includes('node_modules')) return null;
    if (candidate.split(path.sep).includes('.git')) return null;
    return candidate;
}

const PAGES = [
    'test/index.html',
    'test/browser.html',
    'test/browser-min.html',
    'test/esm.html',
    'test/esm-min.html',
    'test/validate.html',
    'test/storage.html',
    'test/net.html',
    'test/file.html',
    'test/plugins.html',
    'test/loading.html',
    'test/loading-min.html',
    'test/mourn.html',
    'test/mourn-min.html'
];

const server = http.createServer((req, res) => {
    let parsed;
    try {
        parsed = new URL(req.url, 'http://' + (req.headers.host || HOST));
    } catch (error) {
        send(res, 400, 'bad request');
        return;
    }

    const pathname = parsed.pathname;

    if (pathname === '/') {
        res.writeHead(302, { Location: '/test/' });
        res.end();
        return;
    }

    if (pathname.startsWith('/fixtures/')) {
        if (serveFixtures(req, res, pathname, parsed.searchParams)) return;
        sendJson(res, 404, { ok: false, error: 'unknown_fixture' });
        return;
    }

    const target = resolveTarget(pathname);
    if (!target) {
        send(res, 403, 'forbidden');
        return;
    }

    fs.stat(target, (error, stat) => {
        if (error) {
            send(res, 404, 'not found: ' + pathname);
            return;
        }

        const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
        fs.readFile(file, (readError, buffer) => {
            if (readError) {
                send(res, 404, 'not found: ' + pathname);
                return;
            }
            const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
            send(res, 200, buffer, type);
        });
    });
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error('Port ' + PORT + ' is already in use. Set PORT to a free port.');
        process.exit(1);
    }
    throw error;
});

server.listen(PORT, HOST, () => {
    console.log('xqgjs test server: http://' + HOST + ':' + PORT + '/');
    for (const page of PAGES) {
        if (fs.existsSync(path.join(ROOT, page))) {
            console.log('  http://' + HOST + ':' + PORT + '/' + page);
        }
    }
    console.log('\nPress Ctrl+C to stop.');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 800).unref();
    });
}

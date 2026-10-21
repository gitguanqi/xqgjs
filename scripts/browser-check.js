#!/usr/bin/env node
/**
 * Optional browser check: opens every page under test/ in a real browser and asserts that the
 * in-page suite passed, that nothing was logged as an error, and that the layout does not
 * overflow horizontally.
 *
 * Playwright is deliberately NOT a dependency of this package. The script looks for a local
 * install and exits with a clear notice when it finds none, so `npm test` stays dependency-free:
 *
 *   npm run serve            # in another terminal
 *   npm run check:browser    # PLAYWRIGHT_PATH=/path/to/playwright if it is not resolvable
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const BASE = process.env.BASE || 'http://127.0.0.1:4001/test/';
const PAGES = [
    'index.html',
    'browser.html',
    'browser-min.html',
    'esm.html',
    'esm-min.html',
    'validate.html',
    'storage.html',
    'net.html',
    'file.html',
    'plugins.html',
    'loading.html',
    'loading-min.html',
    'mourn.html',
    'mourn-min.html'
];
const VIEWPORTS = [
    { width: 1280, height: 800 },
    { width: 390, height: 844 }
];

// Noise the platform produces on purpose: net.html asserts how http() reports a 404, and Chrome
// logs every failed resource load. Nothing else is allowed through.
const EXPECTED = {
    'net.html': ['Failed to load resource']
};

function isExpected(page, text) {
    return (EXPECTED[page] || []).some((needle) => text.includes(needle));
}

function loadPlaywright() {
    const candidates = [process.env.PLAYWRIGHT_PATH, 'playwright', 'playwright-core'].filter(Boolean);
    for (const candidate of candidates) {
        try {
            return require(candidate);
        } catch (error) {
            // try the next candidate
        }
    }
    return null;
}

async function launch(chromium) {
    try {
        // an installed Chrome keeps the run fast and avoids a browser download
        return await chromium.launch({ channel: 'chrome' });
    } catch (error) {
        return chromium.launch();
    }
}

async function visit(context, page, viewport, shotDir) {
    const problems = [];
    const tab = await context.newPage();
    await tab.setViewportSize(viewport);

    tab.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (!isExpected(page, text)) problems.push('console.error: ' + text);
    });
    tab.on('pageerror', (error) => problems.push('pageerror: ' + error.message));
    tab.on('requestfailed', (request) => {
        // the mourn pages deliberately hit a 404 fixture
        if (request.url().includes('/fixtures/404')) return;
        // Chromium reports every HEAD fetch as ERR_ABORTED even when the status was fine, so
        // the index page's link check would always look broken here
        if (request.method() === 'HEAD') return;
        problems.push('requestfailed: ' + request.url() + ' ' + (request.failure() || {}).errorText);
    });
    tab.on('response', (response) => {
        if (response.status() >= 400 && !response.url().includes('/fixtures/404')) {
            problems.push('http ' + response.status() + ': ' + response.url());
        }
    });

    try {
        await tab.goto(BASE + page, { waitUntil: 'load', timeout: 20000 });
        await tab.waitForFunction(() => window.__xqgTest && window.__xqgTest.done === true, null, {
            timeout: 15000
        });
    } catch (error) {
        problems.push('the suite never finished: ' + error.message);
    }

    const state = await tab.evaluate(() => {
        const s = window.__xqgTest || {};
        return {
            done: !!s.done,
            total: s.total,
            passed: s.passed,
            uncaught: s.uncaught || [],
            failures: (s.results || []).filter((item) => !item.ok)
                .map((item) => item.name + ' :: ' + item.message),
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            demoReady: document.body.getAttribute('data-demo-ready')
        };
    });

    if (!state.done) problems.push('state.done is false');
    for (const failure of state.failures) problems.push('FAIL ' + failure);
    for (const error of state.uncaught) problems.push('uncaught: ' + error);
    if (state.scrollWidth > state.innerWidth + 1) {
        problems.push('horizontal overflow: ' + state.scrollWidth + ' > ' + state.innerWidth);
    }
    if (page === 'plugins.html' && state.demoReady !== 'true') {
        problems.push('the plugin demo did not remount after the suite');
    }

    if (shotDir) {
        await tab.screenshot({
            path: path.join(shotDir, page.replace(/\.html$/, '') + '-' + viewport.width + '.png')
        });
    }
    await tab.close();

    return {
        page,
        viewport: viewport.width + 'x' + viewport.height,
        checks: state.total,
        passed: state.passed,
        problems
    };
}

(async () => {
    const playwright = loadPlaywright();
    if (!playwright) {
        console.log('playwright is not installed here - skipping the browser check.');
        console.log('Install it (or set PLAYWRIGHT_PATH) to run: npm run check:browser');
        process.exit(0);
    }

    const shotDir = process.env.SHOTS === '0' ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'xqgjs-'));
    const browser = await launch(playwright.chromium);
    const results = [];

    try {
        for (const viewport of VIEWPORTS) {
            const context = await browser.newContext({ viewport });
            for (const page of PAGES) {
                results.push(await visit(context, page, viewport, shotDir));
            }
            await context.close();
        }
    } finally {
        await browser.close();
    }

    let bad = 0;
    for (const row of results) {
        if (row.problems.length) bad += 1;
        console.log((row.problems.length ? 'FAIL ' : 'ok   ') + row.page.padEnd(18) +
            row.viewport.padEnd(10) + row.passed + '/' + row.checks + ' checks');
        for (const problem of row.problems) console.log('       - ' + problem);
    }

    if (shotDir) console.log('\nscreenshots: ' + shotDir);
    console.log((results.length - bad) + '/' + results.length + ' page runs clean');
    process.exit(bad === 0 ? 0 : 1);
})().catch((error) => {
    console.error(error);
    process.exit(1);
});

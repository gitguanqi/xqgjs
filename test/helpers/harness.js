/**
 * Shared test harness for the manual pages under test/.
 *
 * Every page builds a list of named checks and calls XQTest.run() once. Each check reports
 * PENDING, PASS or FAIL in the page itself, and window.__xqgTest carries the same result for
 * browser automation. Console-only failures are not visible to a human looking at the page,
 * which is why the list is in the document.
 */
(function (global) {
    'use strict';

    var checks = [];
    var state = {
        page: document.title,
        total: 0,
        passed: 0,
        failed: 0,
        done: false,
        status: 'pending',
        results: [],
        uncaught: []
    };
    global.__xqgTest = state;

    var list = null;
    var summary = null;

    function ensureUI() {
        if (list) return;
        list = document.getElementById('checks');
        summary = document.getElementById('summary');
        if (!list) {
            list = document.createElement('ol');
            list.id = 'checks';
            document.body.appendChild(list);
        }
    }

    function row(name) {
        ensureUI();
        var item = document.createElement('li');
        item.className = 'check is-pending';
        var badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'PENDING';
        var label = document.createElement('span');
        label.className = 'label';
        label.textContent = name;
        var detail = document.createElement('span');
        detail.className = 'detail';
        item.appendChild(badge);
        item.appendChild(label);
        item.appendChild(detail);
        list.appendChild(item);
        return { item: item, badge: badge, detail: detail };
    }

    function record(name, ok, message) {
        var node = row(name);
        node.badge.textContent = ok ? 'PASS' : 'FAIL';
        node.item.className = 'check ' + (ok ? 'is-pass' : 'is-fail');
        if (message) node.detail.textContent = message;
        state.results.push({ name: name, ok: ok, message: message || '' });
        if (ok) state.passed += 1;
        else state.failed += 1;
    }

    function eq(actual, expected, label) {
        if (actual !== expected) {
            throw new Error((label || 'value') + ': expected ' + JSON.stringify(expected) +
                ', got ' + JSON.stringify(actual));
        }
    }

    function ok(value, label) {
        if (!value) throw new Error((label || 'value') + ' is not truthy');
    }

    function includes(haystack, needle, label) {
        if (String(haystack).indexOf(needle) === -1) {
            throw new Error((label || 'value') + ' does not contain ' + JSON.stringify(needle));
        }
    }

    function test(name, fn) {
        checks.push({ name: name, fn: fn });
    }

    function skip(name, reason) {
        checks.push({ name: name, skip: reason || 'skipped' });
    }

    function layoutCheck() {
        var width = document.documentElement.scrollWidth;
        var viewport = global.innerWidth;
        var okLayout = width <= viewport + 1;
        record('no horizontal overflow at ' + viewport + 'px', okLayout,
            okLayout ? width + 'px' : 'scrollWidth ' + width + 'px exceeds ' + viewport + 'px');
    }

    function finish() {
        layoutCheck();
        state.total = state.results.length;
        state.done = true;
        state.status = state.failed === 0 ? 'passed' : 'failed';
        if (summary) {
            summary.textContent = state.failed === 0
                ? 'PASS — ' + state.passed + ' checks'
                : 'FAIL — ' + state.failed + ' of ' + state.total + ' checks failed';
            summary.className = 'summary ' + (state.failed === 0 ? 'is-pass' : 'is-fail');
        }
        document.body.setAttribute('data-xqg-status', state.status);
    }

    async function run() {
        ensureUI();
        for (var i = 0; i < checks.length; i += 1) {
            var check = checks[i];
            if (check.skip) {
                var node = row(check.name);
                node.badge.textContent = 'SKIP';
                node.item.className = 'check is-skip';
                node.detail.textContent = check.skip;
                state.results.push({ name: check.name, ok: true, message: 'skipped' });
                continue;
            }
            try {
                await check.fn();
                record(check.name, true, '');
            } catch (error) {
                record(check.name, false, (error && error.message) || String(error));
            }
        }
        finish();
    }

    global.addEventListener('error', function (event) {
        state.uncaught.push(String(event.message));
        if (!state.done) record('no uncaught error during the suite', false, String(event.message));
    });

    global.addEventListener('unhandledrejection', function (event) {
        var reason = event.reason && (event.reason.message || event.reason);
        state.uncaught.push(String(reason));
        if (!state.done) record('no unhandled rejection during the suite', false, String(reason));
    });

    global.XQTest = {
        test: test,
        skip: skip,
        run: run,
        eq: eq,
        ok: ok,
        includes: includes,
        state: state
    };
})(window);

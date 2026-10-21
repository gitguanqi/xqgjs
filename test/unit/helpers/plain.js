'use strict';

/**
 * Copies a value into this realm.
 *
 * Objects created inside a `vm` context carry that realm's prototypes, and `assert.deepEqual`
 * from `node:assert/strict` compares prototypes. Round-tripping through JSON makes a value
 * from the sandbox comparable with a plain object literal in the test.
 */
function plain(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

module.exports = { plain };

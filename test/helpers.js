'use strict';
const assert = require('assert');


// Testing when TTY is false

process.stdout.isTTY = false;
const helpers = require('../lib/report/helpers.js');
const { _pluralLines } = require('../lib/loc.js');

const formatPercent = helpers.formatPercentage('37.85', 6);
const formatPercentExpected = ' 37.85%';
assert.strictEqual(formatPercent, formatPercentExpected,
  'formatPercentage has incorrect output.');

const formatNum = helpers.formatNum('234,345', 8);
const formatNumExpected = ' 234,345';
assert.equal(formatNum, formatNumExpected,
  'formatNum has incorrect output');

const green = helpers.green('green text');
const greenExpected = 'green text';
assert.strictEqual(green, greenExpected, 'green has incorrect output');

const cyan = helpers.cyan('cyan text');
const cyanExpected = 'cyan text';
assert.strictEqual(cyan, cyanExpected, 'cyan has incorrect output');


const leftPad = helpers.leftPad('text', 8);
const leftPadExpected = '    text';
assert.strictEqual(leftPad, leftPadExpected, 'leftPad has incorrect output');

const pluralLines = _pluralLines(12);
assert.strictEqual(pluralLines, 'lines', 'pluralLines has incorrect output');

const singularLines = _pluralLines(1);
assert.strictEqual(singularLines, 'line ', 'pluralLines has incorrect output');

'use strict';
const assert = require('assert');

// Testing when TTY is true
process.stdout.isTTY = true;
const helpers = require('../lib/report/helpers.js');

const formatPercentTTY = helpers.formatPercentage('37.85', 6);
const formatPercentTTYExpected = '\u001b[96m 37.85%\u001b[0m';
assert.strictEqual(formatPercentTTY, formatPercentTTYExpected,
  'formatPercentage TTY has incorrect output.');

const formatNumTTY = helpers.formatNum('234,345', 8);
const formatNumTTYExpected = '\u001b[32m\u001b[1m 234,345\u001b[0m';
assert.strictEqual(formatNumTTY, formatNumTTYExpected,
  'formatNum TTY has incorrect output');

const greenTTY = helpers.green('green text');
const greenTTYExpected = '\u001b[32mgreen text\u001b[0m';
assert.strictEqual(greenTTY, greenTTYExpected, 'green TTY has incorrect output');

const cyanTTY = helpers.cyan('cyan text');
const cyanTTYExpected = '\u001b[96mcyan text\u001b[0m';
assert.strictEqual(cyanTTY, cyanTTYExpected, 'cyan TTY has incorrect output');

// @flow
'use strict';

let isTTY = false;
if (process.stdout.isTTY) { // Make Flow happy
  isTTY = process.stdout.isTTY;
}

const GREEN = isTTY ? '\u001b[32m' : '';
const CYAN = isTTY ? '\u001b[96m' : '';
const RESET = isTTY ? '\u001b[0m' : '';
const BOLD = isTTY ? '\u001b[1m' : '';

function formatPercentage(num/*: string*/, textLen/*: number*/)/*: string*/ {
  return CYAN + leftPad(num, textLen) + '%' + RESET;
}

function formatNum(numStr/*: string*/, textLen/*: number*/)/*: string*/ {
  return GREEN + BOLD + leftPad(numStr, textLen) + RESET;
}

function green(text/*: string*/)/*: string*/ {
  return GREEN + text + RESET;
}

function cyan(text/*: string*/)/*: string*/ {
  return CYAN + text + RESET;
}

function leftPad(text/*: string*/, length/*: number*/)/*: string*/ {
  const paddingToAdd = length - text.length;
  let result = text;
  for (let i = 0; i < paddingToAdd; i++) {
    result = ' ' + result;
  }
  return result;
}

module.exports = {
  green, cyan,
  formatPercentage,
  formatNum,
  leftPad
};

// @flow
'use strict';
const { analyze }     = require('../lib/static-analysis/index.js');
const report          = require('../lib/report');
const { green, cyan, formatNum, formatPercentage } = require('../lib/report/helpers.js');

function _pluralLines(num/*: number*/)/*: string*/ {
  if (num === 1) {
    return 'line ';
  } else {
    return 'lines';
  }
}

function showReport(reportData) {
  const intrinsicAscii = '\n' +
  '_)      |       _)         _)      \n' +
  ' | __ \\ __|  __| | __ \\ __| |  __| \n' +
  ' | |  | |   |    | |  |\\__\\ | (    \n' +
  '_|_| _|\\__|_|   _|_| _|___/_|\\___| \n';

  const notes = cyan('Want to learn more?') + ' ' + green('https://intrinsic.com/ \n\n');
  console.log(green(intrinsicAscii) + processReport(reportData) + cyan(notes));
}

function processReport(reportData) {
  const appCode = reportData.application.code;
  const modCode = reportData.node_modules.code;
  const total = appCode + modCode;

  const appPercentage = (appCode / total * 100).toFixed(2);
  const modPercentage = (modCode / total * 100).toFixed(2);

  let out = '\n\n';

  const appCodeStr = appCode.toLocaleString();
  const modCodeStr = modCode.toLocaleString();

  const len = Math.max(appCodeStr.length, modCodeStr.length);
  const lenPercentage = Math.max(appPercentage.length, modPercentage.length);

  out += `Your application code:  ${formatNum(appCodeStr, len)} ` + _pluralLines(appCode) +
    ` (${formatPercentage(appPercentage, lenPercentage)}) \n`;

  out += `  \`node_modules\` code:  ${formatNum(modCodeStr, len)} ` + _pluralLines(modCode) +
    ` (${formatPercentage(modPercentage, lenPercentage)}) \n`;

  if (modCode === 0) {
    out += '\nWe didn\'t find any dependencies! Did you remember to npm install first?\n';
  }

  return out + '\n\n';
}


function run() {
  analyze(true)
    .then(staticData => {
      const ansiReport = report(staticData);
      showReport(ansiReport);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  run,
  _pluralLines // for testing
};

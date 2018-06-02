#!/usr/bin/env node
'use strict';

const DependencyScanner = require('../lib/static-analysis/dependency-scanner/index.js');
const LocAnalyzer = require('../lib/static-analysis/loc-analyzer/index.js');
const report = require('../lib/report/index.js');

const assert = require('assert');
const path = require('path');

const x = path.resolve(process.cwd(), 'fixtures/fake-test-app/');

const dScanner = new DependencyScanner(x);

let numOfModules = 0;
function addModule() {
  numOfModules++;
}

dScanner.scanDependencies()
  .then(rootNode => {
    return LocAnalyzer.annotateTreeWithLoc(rootNode, addModule);
  })
  .then(rootNode => {
    const actual = report(rootNode);
    const expected = {
      application: {
        blank: 2,
        comment: 0,
        code: 25,
        numFiles: 5
      },
      node_modules: {
        blank: 0,
        comment: 2,
        code: 39,
        numFiles: 13
      }
    };
    assert.strictEqual(numOfModules, 9, 'Error: number of modules is incorrect');
    assert.deepStrictEqual(actual, expected, 'Error: report output does not match expected');
  })
  .catch(err => {
    throw err;
  });

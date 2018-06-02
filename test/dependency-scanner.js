#!/usr/bin/env node
'use strict';

const DependencyScanner = require('../lib/static-analysis/dependency-scanner/index.js');
const assert = require('assert');
const path = require('path');

const testApp = path.join(__dirname, '../fixtures/fake-test-app/');
const dScanner = new DependencyScanner(testApp);

dScanner.scanDependencies()
  .then(rootNode => {
    const correctTreeString =
      'fake-test-app@1.0.0\n' +
      '  aModule@5.1.1\n' +
      '  bModule@0.0.0\n' +
      '  @abCorp/leftpad@0.0.0\n' +
      '  @abCorp/rightpad@3.9.3\n' +
      '  @scoped/testModule@0.0.0\n' +
      '    aModule@5.1.1\n' +
      '    @abCorp/leftpad@0.0.0\n' +
      '    @abCorp/rightpad@3.9.3\n';

    assert.strictEqual(rootNode.treeString(), correctTreeString,
      'Error: test-app tree is not as expected');
  }).catch(err => {
    throw err;
  });

// @flow
'use strict';

/*::
import type DependencyTreeNode from '../static-analysis/dependency-scanner/dependency-tree-node';
import type { Report } from './generate-report.js';
*/

const generateReport = require('./generate-report.js');

module.exports = (staticAnalysis/*: DependencyTreeNode*/)/*: Report*/ => {
  return generateReport.analyzeJson(staticAnalysis);
};

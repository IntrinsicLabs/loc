// @flow
/* eslint-disable max-len */
'use strict';

/*::
import type DependencyTreeNode from '../static-analysis/dependency-scanner/dependency-tree-node';

export type Require = {|
  name: string
|};

export type Aggregate = {|
  blank: number,
  comment: number,
  code: number,
  numFiles: number
|};

export type Report = {|
  application: Aggregate,
  node_modules: Aggregate
|}

*/

const langsToAggregate = [
  'JavaScript',
  'C++',
  'TypeScript',
  'C',
  'C/C++ Header'
];

process.on('unhandledRejection', function (err/*: Error */) {
  console.error('Unhandled rejection:');
  throw err;
});

module.exports.analyzeJson = analyzeJson;

function analyzeJson(rootNode/*: DependencyTreeNode*/)/*: Report*/ {
  const deps = [];
  _flattenChildren(rootNode.children, deps);
  return reportOnLoc(rootNode, deps);
}

function reportOnLoc(rootNode/*: DependencyTreeNode*/, deps)/*: Report*/ {
  aggregateLocForNode(rootNode);
  deps.forEach(dep => aggregateLocForNode(dep));

  const rootLocInfo = rootNode.aggregateLoc;
  const depsLocInfo = aggregateAggregateLoc(deps);

  if (!rootLocInfo) {
    throw new Error('Need rootLocInfo');
  }

  return compareLocForLanguages(langsToAggregate, rootLocInfo, depsLocInfo);
}

function _flattenTree(node/*: DependencyTreeNode*/, acc) {
  acc.push(node);
  _flattenChildren(node.children, acc);
}

function _flattenChildren(children, acc) {
  children.forEach(child => _flattenTree(child, acc));
}

function aggregateLocForNode(node/*: DependencyTreeNode*/) {
  const aggregateLoc = {};
  _aggregateLocForNode(node, aggregateLoc);
  node.aggregateLoc = aggregateLoc;
}

function _aggregateLocForNode(node/*: DependencyTreeNode*/, aggregateLoc/*: {[string]: Aggregate}*/) {
  const locInfo = node.locInfo;
  for (const key in locInfo) {
    const info = locInfo[key];
    const lang = info.language;
    if (!lang) {
      continue;
    }
    if (!(lang in aggregateLoc)) {
      aggregateLoc[lang] = {
        blank: 0,
        comment: 0,
        code: 0,
        numFiles: 0
      };
    }
    const acc = aggregateLoc[lang];

    acc.blank += info.blank;
    acc.comment += info.comment;
    acc.code += info.code;
    acc.numFiles += 1;
  }
}

function aggregateAggregateLoc(nodes/*: Array<DependencyTreeNode>*/)/*: {[string]: Aggregate}*/ {
  const aggregateLoc = {};
  nodes.forEach(node => {
    _aggregateLocForNode(node, aggregateLoc);
  });
  return aggregateLoc;
}

function compareLocForLanguages(languages/*: Array<string>*/, a/*: {[string]: Aggregate}*/, b/*: {[string]: Aggregate}*/)/*: Report*/ {
  const appLoc = aggregateLocForLanguages(languages, a);
  const modLoc = aggregateLocForLanguages(languages, b);
  return {
    application: appLoc,
    node_modules: modLoc
  };
}


function aggregateLocForLanguages(languages, aggregateLoc)/*: Aggregate*/ {
  const acc = {
    blank: 0,
    comment: 0,
    code: 0,
    numFiles: 0
  };

  for (const lang in aggregateLoc) {
    if (languages.includes(lang)) {
      const info = aggregateLoc[lang];
      acc.blank += info.blank;
      acc.comment += info.comment;
      acc.code += info.code;
      acc.numFiles += info.numFiles;
    }
  }
  return acc;
}

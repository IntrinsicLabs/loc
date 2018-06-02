// @flow
'use strict';

const DependencyScanner = require('./dependency-scanner');
const LocAnalyzer       = require('./loc-analyzer');
const fs                = require('fs');
const os                = require('os');
const path              = require('path');

/*:: import type DependencyTreeNode from './dependency-scanner/dependency-tree-node'; */

process.on('unhandledRejection', function (err/*: Error*/) {
  console.error('Unhandled rejection:');
  throw err;
});

function cli() {
  return analyze(true)
    .then(rootNode => {
      // eslint-disable-next-line no-sync
      fs.writeFileSync(
        path.join(os.tmpdir(), 'results'),
        JSON.stringify(rootNode, null, 2)
      );
      console.log(JSON.stringify(rootNode, null, 2));
    })
    .catch((err/*: Error*/) => {
      console.error(err);
      process.exit(1);
    });
}

function gauge(pct/*: number*/) {
  const pretty = pct.toFixed(2);
  const formatted = `${pct < 10 ? '  ' : (pct < 100 ? ' ' : '')}${pretty}%`;
  if (!process.stderr.isTTY) {
    return `done: ${formatted}`;
  }
  if (typeof process.stderr.columns !== 'number') {
    throw new Error('process.stderr is not a TTY');
  }
  const totalWidth = process.stderr.columns - 11;
  const doneWidth = pct > 0 ? Math.floor(totalWidth * pct / 100) || 1 : 0;
  const undoneWidth = totalWidth - doneWidth;
  return `[${'='.repeat(doneWidth)}${' '.repeat(undoneWidth)}] ${formatted}`;
}

function analyze(shouldLog/*: boolean*/ = false, appEntry/*: ?string*/)/*: Promise<DependencyTreeNode> */ {
  // BEGIN progress logging
  let numberOfNodes = Number.MAX_SAFE_INTEGER;
  let locDone = 0;
  let dependencyScannerDone = 0;
  let firstProgressLog = true;
  function addLocDone() {
    locDone++;
    logProgress();
  }
  function addDependencyScannerDone() {
    dependencyScannerDone = 1;
    logProgress();
  }
  function logProgress() {
    if (firstProgressLog) {
      console.error();
      firstProgressLog = false;
    }
    const pct = Math.floor((
      (dependencyScannerDone * 0.02) +
      (locDone / numberOfNodes * 0.98)) *
      1000) / 10; // floor at 2 decimal places
    process.stderr.write('\x1b[2K\x1b[1000D' + gauge(pct));
  }
  // END progress logging

  const log = shouldLog ? console.log : (_/*: string*/) => { /* noop */ };
  const cwd = process.cwd();
  let rootNode/*: DependencyTreeNode*/;
  let nodes/*: Array<DependencyTreeNode>*/ = [];
  const argumentRootPath = appEntry ?
    path.dirname(path.resolve(cwd, appEntry)) :
    cwd;
  return traverseUpToAppRoot(argumentRootPath)
    .then((appRoot) => {
      log(`found packageJson in ${appRoot}`);
      const ds = new DependencyScanner(appRoot);
      return ds.scanDependencies();
    }, (_err/*: Error*/) => {
      const traverseErr =
        new Error(`Tried to traverse up (from '${cwd}') to find a package.json, but didn't find one.`);
      throw traverseErr;
    })
    .then(depTreeRoot => {
      addDependencyScannerDone();
      if (!depTreeRoot) {
        throw new Error('No Dependency Tree Root');
      }
      rootNode = depTreeRoot;
      nodes = rootNode.listOfNodes();
      numberOfNodes = nodes.length;
      return LocAnalyzer.annotateTreeWithLoc(depTreeRoot, addLocDone);
    })
    .then(() => {
      logProgress();
      console.error();
      if (!rootNode) {
        throw new Error('No Root Node');
      }
      return rootNode;
    });

}


function traverseUpToAppRoot(startingPath/*: string*/)/*: Promise<string>*/ {
  if (startingPath === '/') {
    throw new Error(`Traversed to '/' without finding a package.json file`);
  }

  return doesDirHavePackageJson(startingPath)
    .then(hasPackageJson => {
      if (hasPackageJson) {
        return startingPath;
      } else {
        const upOne = path.resolve(startingPath, '..');
        return traverseUpToAppRoot(upOne);
      }
    });
}

function doesDirHavePackageJson(dir/*: string*/)/*: Promise<bool>*/ {
  return new Promise((resolve, _reject) => {
    const pathToTest = path.join(dir, 'package.json');
    fs.exists(pathToTest, exists => resolve(exists));
  });
}

module.exports = {
  analyze,
  cli
};

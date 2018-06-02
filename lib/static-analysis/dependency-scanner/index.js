// @flow
'use strict';

const DependencyTreeNode = require('./dependency-tree-node.js');
const fs                 = require('fs');
const path               = require('path');
const promisify          = require('../../common/promisify.js');

/*::
import type { PackageJson } from './dependency-tree-node.js';
*/

class DependencyScanner {
  /*::
    _baseDir: string
    _baseDirs: Array<string>
    _dedupables: {[string]: DependencyTreeNode | void}
  */
  constructor(baseDir/*: string*/) {
    this._baseDir = baseDir;
  }

  scanDependencies()/*: Promise<DependencyTreeNode>*/ {
    const baseDir = path.resolve(this._baseDir);
    this._dedupables = {};
    return this._getBaseDirectories(this._baseDir)
      .then(dirs => {
        this._baseDirs = dirs;
        return this._scanDir(baseDir);
      })
      .then(node => this._dedupe(node));
  }

  _dedupe(node/*: DependencyTreeNode*/) {
    if (node.children && node.children.length) {
      node.children.forEach(child => this._dedupe(child));
    }
    if (node.parent) { // not root
      if (node.realpath && this._baseDirs.includes(node.realpath)) {
        const parent = node.parent;
        if (parent) {
          parent.children.splice(parent.children.indexOf(node), 1);
        }
        return node;
      }
    }
    if (node.realpath && this._dedupables[node.realpath]) {
      const oldNode = this._dedupables[node.realpath];
      const parent = oldNode.parent;
      delete oldNode.parent;
      if (parent) {
        parent.children.splice(parent.children.indexOf(node), 1);
      }
    }
    if (node.realpath) {
      this._dedupables[node.realpath] = node;
    }

    return node;
  }

  _scanDir(absolutePath/*: string*/, depth/*: number*/ = 0)/*: Promise<DependencyTreeNode>*/ {
    let node;
    return this._getPackageJson(absolutePath)
      .then((packageJson/*: PackageJson*/) => {
        node = new DependencyTreeNode(packageJson, absolutePath);
        return node.setRealPath();
      })
      .then(() => this._recurseWithNode(node, depth));
  }

  _recurseWithNode(node/*: DependencyTreeNode*/, depth/*: number*/ = 0)/*: Promise<DependencyTreeNode>*/ {
    return this._getNodeModuleList(node.path)
      .then(dirs => {
        return this._collapseScopedModules(dirs)
          .then((collapsedDirs) => {
            return Promise.all(collapsedDirs.map(dir => this._scanDir(dir, depth + 1)));
          });
      })
      .then(nodes => {
        nodes.forEach(childNode => node.addChildNode(childNode));
        return node;
      });
  }

  // This function finds all scoped modules and collapses them so that we don't
  // count the scope as a module itself.
  _collapseScopedModules(dirs/*: Array<string>*/) /*: Promise<Array<string>> */ {
    const promises = [];
    let collapsedDirs = [];
    dirs.forEach(d => {
      if (path.basename(d)[0] === '@') {
        promises.push(getBaseDirs(d));
      } else {
        collapsedDirs.push(d);
      }
    });
    return Promise.all(promises).then((scopedDepDirs/*: Array<Array<string>>*/) => {
      scopedDepDirs.forEach(a => {
        collapsedDirs = collapsedDirs.concat(a);
      });
      return collapsedDirs;
    });
  }

  _getPackageJson(baseDir/*: string*/)/*: Promise<PackageJson>*/ {
    const packageJsonPath = path.join(baseDir, 'package.json');
    return new Promise(resolve => {
      fs.readFile(packageJsonPath, (err/*: ?Error*/, buf/*: ?Buffer*/) => {
        if (err || !buf) {
          // No package.json, construct a fake one just for building the tree.
          const pathArray = baseDir.split(path.sep);
          let name = String(pathArray.pop());
          const maybeScope = pathArray.pop();
          if (maybeScope[0] === '@') {
            name = String(maybeScope) + '/' + name;
          }
          const fakePackage/*: PackageJson*/ = {
            name: name,
            version: '0.0.0'
          };
          resolve(fakePackage);
        } else {
          const parsed/*: PackageJson*/ = JSON.parse(buf.toString());
          if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('invalid package.json');
          }
          resolve(parsed);
        }
      });
    });
  }

  _getNodeModuleList(baseDir/*: string*/)/*: Promise<Array<string>>*/ {
    const modPath = path.join(baseDir, 'node_modules');
    let theDirs;
    return new Promise(res => {
      fs.readdir(modPath, (err, dirs) => res(err ? [] : dirs));
    })
      .then(dirs => {
        theDirs = dirs;
        const promises = dirs.map(dir => {
          return new Promise(res => {
            const theDir = path.join(modPath, dir);
            fs.stat(theDir, (err, stat) => res(err ? false : stat.isDirectory()));
          });
        });
        return Promise.all(promises);
      })
      .then(isDir => {
        // filter out hidden dirs (e.g., '.yarn-integrity', '.bin')
        return theDirs
          .filter((dir, i) => isDir[i] && !['.'].some(s => dir.startsWith(s)))
          .map(relative => path.join(modPath, relative));
      });
  }

  _getBaseDirectories(baseDir/*: string*/)/*: Promise<Array<string>>*/ {
    return getBaseDirs(baseDir);
  }
}
/*::
type PromStringStrings = (string) => Promise<Array<string>>
type PromStringArrayStats =  (Array<string>) => Promise<Array<Stats>>
*/
const readDir/*: PromStringStrings*/ = /*:: ((*/promisify(fs.readdir)/*:: : any) : PromStringStrings)*/;
const realPathAll = promisifyMap.bind(null, fs.realpath, false);
const statsAll/*: PromStringArrayStats*/ =
  /*:: ((*/promisifyMap.bind(null, fs.stat, true)/*:: : any) : PromStringArrayStats)*/;

function getBaseDirs(dir/*: string*/, seenList/*: Array<string>*/ = [])/*: Promise<Array<string>>*/ {
  return _getBaseDirs(dir, seenList)
    .then(dirs => {
      if (!dirs.length) {
        return dirs;
      }
      return Promise.all(dirs.map(d => getBaseDirs(d, seenList)))
        .then(lists => {
          const result = [...dirs];
          lists.forEach(l => result.push.apply(result, l));
          return result;
        });
    });
}

/*::
type Stats = {
  isDirectory: () => boolean
}
*/

function _getBaseDirs(dir/*: string*/, seenList/*: Array<string>*/)/*: Promise<Array<string>>*/ {
  if (seenList.includes(dir)) {
    return Promise.resolve([]);
  }
  return readDir(dir)
    .then(dirList => realPathAll(
      dirList
        .filter(d => d !== 'node_modules' && d !== '.git')
        .map(d => path.join(dir, d))
        .filter(d => !seenList.includes(d)))
    )
    .then(statsAll)
    .then(all => all.filter(([_, stats]) => stats.isDirectory()).map(([d]) => {
      seenList.push(d);
      return d;
    }));
}

function promisifyMap(fn/*: ?Function*/, includeInput/*: boolean*/,
  list/*: Array<string>*/)/*: Promise<Array<string>>*/ {
  return Promise.all(list.map(promisify(fn, includeInput)));
}

module.exports = DependencyScanner;

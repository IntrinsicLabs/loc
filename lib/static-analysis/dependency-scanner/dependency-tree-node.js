// @flow
'use strict';

/*::
import type { Aggregate } from '../../report/generate-report';

export type PackageJson = {
  dependencies?: {[string]: string | void};
  devDependencies?: {[string]: string | void};
  scripts?: {[string]: string | void};
  name?: string;
  version?: string;
}
*/

const fs = require('fs');

class DependencyTreeNode {
  /*::
  name: ?string;
  packageJson: ?PackageJson;
  locInfo: Object | null;
  path: string;
  realpath: ?string;
  parent: ?DependencyTreeNode;
  version: ?string;
  children: Array<DependencyTreeNode>;
  requireInfo: ?Array<{filePath: string, requires: Array<string>, evals: Array<string>}>;
  aggregateLoc: ?{[string]: Aggregate};
  licenseInfo: ?mixed;
  moduleInfo: {totalInstances: number, uniqueModules: number, perModule: {}};
  packageLock: ?mixed;
  */

  constructor(
    packageJson/*: PackageJson | null*/,
    path/*: string*/
  ) {
    this.packageJson = packageJson;
    this.locInfo = null;
    this.path = path;
    this.children = [];

    if (packageJson && typeof packageJson.name === 'string') {
      this.name = packageJson.name;
    }
    if (packageJson && typeof packageJson.version === 'string') {
      this.version = packageJson.version;
    }
  }

  addChildNode(node/*: DependencyTreeNode*/) {
    this.children.push(node);
    node.parent = this;
  }

  setRealPath()/*: Promise<void>*/ {
    return new Promise((resolve, reject) => {
      fs.realpath(this.path, (err/*: ?Error*/, realpath/*: ?string*/) => {
        if (err) {
          reject(err);
          return;
        }
        this.realpath = realpath;
        resolve();
      });
    });
  }

  versionAsString()/*: string*/ {
    if (this.packageJson && this.packageJson.version) {
      return String(this.packageJson.version);
    }

    return '[[NO VERSION]]';
  }

  nameAsString()/*: string*/ {
    if (this.name) {
      return this.name;
    } else {
      return '[[NO NAME]]';
    }
  }

  // Return all of the nodes of this tree flattened into a list
  listOfNodes()/*: Array<DependencyTreeNode>*/ {
    const nodes = [];
    this._listOfNodes(nodes);
    return nodes;
  }

  _listOfNodes(nodes/*: Array<DependencyTreeNode>*/) {
    nodes.push(this);
    this.children.forEach(child => child._listOfNodes(nodes));
  }

  // inspecting related:
  treeString(depth/*: number*/ = 0)/*: string*/ {
    let acc = '';

    acc += this._nodeSummaryForDepth(this, depth);
    this.children.forEach(child => {
      acc += child.treeString(depth + 1);
    });

    return acc;
  }

  _nodeSummaryForDepth(node/*: DependencyTreeNode*/, depth/*: number*/) {
    const indentation = depth * 2;
    const leading = new Array(indentation + 1).join(' ');
    return `${leading}${node.nameAsString()}@${node.versionAsString()}\n`;
  }

  inspect()/*: string*/ {
    return this.treeString();
  }

  // Removes the parent attribute when serializing object to remove circulare references
  toJSON() {
    return Object.assign({}, this, { parent: undefined });
  }
}

module.exports = DependencyTreeNode;

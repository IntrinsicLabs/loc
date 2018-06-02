// @flow
'use strict';

const clocWrapper = require('./cloc-wrapper.js');

/*:: import type DependencyTreeNode from '../dependency-scanner/dependency-tree-node'; */

function annotateTreeWithLoc(
  rootNode/*: DependencyTreeNode*/,
  onNodeComplete/*: () => void*/
)/*: Promise<DependencyTreeNode>*/ {
  return clocWrapper
    .runLoc({
      excludedDirs: ['node_modules', 'bower_components'],
      dir: rootNode.path
    })
    .then((results/*: {}*/) => {
      rootNode.locInfo = results;
      onNodeComplete();
      const promises = rootNode.children.map(child => annotateTreeWithLoc(child, onNodeComplete));
      return Promise.all(promises).then(() => rootNode);
    });
}

module.exports = {
  annotateTreeWithLoc
};

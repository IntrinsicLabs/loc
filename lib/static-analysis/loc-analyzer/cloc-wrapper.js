// @flow
'use strict';

const child_process = require('child_process');
const path          = require('path');
const fs            = require('fs');
const os            = require('os');
const promisify     = require('../../common/promisify.js');

const PATH_TO_CLOC_BIN = path.join(
  path.dirname(require.resolve('cloc/package')), 'lib', 'cloc'
);

const MAX_CONCURRENT = os.cpus().length;

function runLoc(opts/*: {
  dir: string,
  excludedDirs?: Array<string>
}*/)/*: Promise<{}>*/ {
  const dir = opts.dir;

  const flags = [
    '--json',
    // tried to use '--by-file-by-lang' but it doesn't produce valid json
    // output, so we'll just aggregate on our own
    '--by-file',
    // TODO: Very occasionally `cloc` seems to not respect this list.
    // Investigate further.
    '--skip-archive=\'(tgz|zip|tar(.(gz|Z|bz2|xz|7z))?)\''
  ];

  let fileList;
  return createFileList(dir, opts.excludedDirs || [])
    .then(_fileList => {
      fileList = _fileList;
      return _spawnWithArgs([...flags, `--list-file=${fileList}`]);
    })
    .then(({ code, stdout, stderr }) => {
      if (code !== 0 && code !== null) {
        console.log(stdout.replace(/\n/g, '\n[cloc stdout]'));
        console.error(stderr.replace(/\n/g, '\n[cloc stderr]'));
        throw new Error(`${'`cloc`'} exited with code ${code}`);
      }
      fs.unlink(fileList, err => {
        if (err) {
          throw err;
        }
        fs.rmdir(path.dirname(fileList), err => {
          if (err) {
            throw err;
          }
        });
      });
      let data;
      try {
        data = JSON.parse(stdout);
        delete data.SUM;
        delete data.header;
      } catch (e) {
        data = {};
      }
      return data;
    });
}

// We limit the concurrency of _spawnWithArgs using this little resolver
// scheduler thingy
const _scheduled = [];
let _numRunning = 0;
function _checkForScheduled() {
  const spotsAvailable = MAX_CONCURRENT - _numRunning;
  const numToSchedule = Math.min(spotsAvailable, _scheduled.length);
  for (let i = 0; i < numToSchedule; i++) {
    _numRunning += 1;
    const resolve = _scheduled.shift();
    resolve();
  }
}

/*::
type Stats = {
  isDirectory: () => boolean
}
type PromStringToStrings = (string) => Promise<Array<string>>
type PromStringToString = (string) => Promise<string>
type PromStringToStats = (string) => Promise<Stats>
type PromStringString = (string, string) => Promise<void>
*/

const readDir/*: PromStringToStrings*/ = /*:: ((*/promisify(fs.readdir)/*:: : any) : PromStringToStrings)*/;
const realPath/*: PromStringToString*/ = /*:: ((*/promisify(fs.realpath)/*:: : any) : PromStringToString)*/;
const stat/*: PromStringToStats*/ = /*:: ((*/promisify(fs.stat)/*:: : any) : PromStringToStats)*/;
const mkdtemp/*: PromStringToString*/ = /*:: ((*/promisify(fs.mkdtemp)/*:: : any) : PromStringToString)*/;
const writeFile/*: PromStringString*/ = /*:: ((*/promisify(fs.writeFile)/*:: : any) : PromStringString)*/;

function createFileList(dir/*: string*/, excludedDirs/*: Array<string>*/)/*: Promise<string>*/ {
  const filterFn = mkFilterFn(dir, excludedDirs);
  let tmpFolder;
  let fileListFileName;
  return mkdtemp(path.join(os.tmpdir(), 'cloc-args-'))
    .then(_tmpFolder => {
      tmpFolder = _tmpFolder;
      return getAllFiles(dir, filterFn, new Set(), new Set());
    })
    .then(files => {
      fileListFileName = path.join(tmpFolder, 'files');
      return writeFile(fileListFileName, Array.from(files).join('\n'));
    })
    .then(() => fileListFileName);
}

function getAllFiles(dir/*: string*/, filterFn/*: Function*/, files/*: Set<string>*/,
  seenDirs/*: Set<string>*/)/*: Promise<Set<string>>*/ {
  let filteredPaths;
  return readDir(dir)
    .then(filesInDir => {
      const fullFiles = filesInDir.map(d => path.join(dir, d));
      return Promise.all(fullFiles.map(x => {
        return realPath(x).catch((err) => {
          console.error(err.message);
          return null;
        });
      }));
    })
    .then(realPaths => {
      filteredPaths = realPaths.filter(filterFn);
      return Promise.all(filteredPaths.map(x => {
        return stat(x).catch(err => {
          console.error(err.message);
          return null;
        });
      }));
    })
    .then(stats => {
      const forRecursion = [];
      stats.forEach((s, i) => {
        if (s === null) {
          return;
        }
        const fName = filteredPaths[i];
        if (files.has(fName)) {
          return;
        }
        if (s.isDirectory()) {
          if (seenDirs.has(fName)) {
            return;
          }
          forRecursion.push(fName);
          seenDirs.add(fName);
        } else {
          files.add(fName);
        }
      });
      const recursions =
        forRecursion.map(d => getAllFiles(d, filterFn, files, seenDirs));
      return Promise.all(recursions);
    })
    .then(() => files);
}

function mkFilterFn(dir/*: string*/, excludedDirs/*: Array<string>*/)/*: (string) => boolean*/ {
  return (file/*: string*/) => {
    if (file === null) {
      return false;
    }
    if (!file.startsWith(dir)) {
      return false;
    }
    if (file.includes('/.')) {
      return false;
    }
    if (excludedDirs.some(xDir => file.replace(dir, '').includes(`/${xDir}/`))) {
      return false;
    }
    if (path.extname(file) === '.tgz') {
      return false;
    }
    return true;
  };
}

function _spawnWithArgs(args/*: Array<string>*/)/*: Promise<{
  code: number,
  stdout: string,
  stderr: string
}>*/ { // eslint-disable-line brace-style
  return new Promise(resolve => {
    if (_numRunning < MAX_CONCURRENT) {
      _numRunning += 1;
      resolve();
    } else {
      _scheduled.push(resolve);
    }
  })
    .then(() => {
      return new Promise((resolve, _reject) => {
        // This is detached because otherwise if the user SIGINTs the entire
        // process tree (i.e. via Ctrl-C), then the signal will be sent to cloc.
        // We don't want this, because otherwise we get buggered output, which
        // can't be parsed.
        const cloc = child_process.spawn(PATH_TO_CLOC_BIN, args, {
          detached: true
        });

        let stdout = '';
        let stderr = '';

        cloc.stdout.on('data', (data/*: string*/) => {
          stdout += data;
        });
        cloc.stderr.on('data', (data/*: string*/) => {
          stderr += data;
        });

        cloc.once('close', (code/*: number*/) => {
          resolve({
            code,
            stdout,
            stderr
          });
          _numRunning -= 1;
          _checkForScheduled();
        });
      });
    });
}

module.exports = {
  runLoc
};

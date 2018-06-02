'use strict';

// We could use the built-in `util.promisify` in node 8 and higher, but then we
// wouldn't be able to use `includeInput`, which simplifies some things.

const promisify = (fn, includeInput) => (...args) =>
  new Promise((res, rej) => {
    const fnArgs = typeof includeInput === 'boolean' ? [args[0]] : args;
    fn(...fnArgs, (err, data) => {
      if (err) {
        rej(err);
      } else {
        res(includeInput === true ? [args[0], data] : data);
      }
    });
  });

module.exports = promisify;

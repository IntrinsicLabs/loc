'use strict';

const { exec } = require('child_process');

exec('../../bin/loc', { cwd: './fixtures/fake-no-deps/' }, (err, stdout) => {
  if (err) {
    throw err;
  }

  if (!stdout.includes('We didn\'t find any dependencies! Did you remember to npm install first?')) {
    throw new Error('fake-no-deps has incorrect output');
  }

});

exec('../../bin/loc', { cwd: './fixtures/fake-test-app/' }, (err, stdout) => {
  if (err) {
    throw err;
  }

  if (stdout.includes('We didn\'t find any dependencies! Did you remember to npm install first?') ||
    !stdout.includes('`node_modules` code:  39 lines (60.94%)')) {
    throw new Error('fake-test-app has incorrect output');
  }
});

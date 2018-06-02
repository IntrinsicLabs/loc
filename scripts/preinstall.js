// @flow
'use strict';

const { exec } = require('child_process');

exec('perl -v', (err) => {
  if (err) {
    // perl is not installed
    console.log('You must have `perl` installed on your machine. https://www.perl.org/get.html');
    process.exit(1);
  }
});

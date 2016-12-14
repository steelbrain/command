#!/usr/bin/env node

/* @flow */

const cli = require('../')

cli
  .version('0.0.1')
  .command('init', 'Initialize an empty repo', function() {
    console.log('git-init')
  })
  .command('add [files...]', 'Add file contents to index', function(files) {
    console.log('git-add', files)
  })
  .command('remote.add [addr]', 'Add a remote server to repo', function(addr) {
    console.log('git-remote-add', addr)
  })
  .option('-v, --verbose', 'Enable verbosity', false)
  .option('-c, --config <key> <value>', 'Config')
  .parse(process.argv)

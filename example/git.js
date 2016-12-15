#!/usr/bin/env node

/* @flow */

const command = require('../')

command
  .version('0.0.1')
  .description('Git Versonal Control System')
  .command('init', 'Initialize an empty repo', function() {
    console.log('git-init')
  })
  .command('add [files...]', 'Add file contents to index', function(options, files) {
    console.log('git-add', files)
  })
  .command('remote.add [addr]', 'Add a remote server to repo', function(options, addr) {
    console.log('git-remote-add', addr)
  })
  .option('-v, --verbose', 'Enable verbosity', false)
  .option('-c, --config <key> <value>', 'Config')
  .default(function(options) {
    console.log(options)
  })
  .parse(process.argv)

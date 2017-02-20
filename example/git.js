#!/usr/bin/env node

/* @flow */

const command = require('../')

command
  .version('0.0.1')
  .description('Git Versonal Control System')
  .option('--disable-cache', 'Disable Git Cache')
  .command('init', 'Initialize an empty repo', function() {
    console.log('git-init')
  })
  .option('--shallow-copy', 'Initialize with shallow copy')
  .command('add [files...]', 'Add file contents to index', function(options, files) {
    console.log('git-add', files)
  })
  .option('--dry-run', 'Try to stage the file into git index but dont actually do it')
  .default(function(options, parameters) {
    console.log(options, parameters)
  })
  .process()

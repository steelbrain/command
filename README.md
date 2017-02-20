sb-command
=========

sb-command is the CLI parser you'll ever need.

## Documentation

There are several types of parameters

 - `[name]` means `name` is an optional parameter
 - `<name>` means `name` is a required parameter
 - `[name...]` means `name` is an optional variadic parameter
 - `<name...>` means `name` is a required variadic parameter
 - Specifying no parameter with an option means it's boolean

To add nested commands, simply join them with dot. For example for `remote add` use `remote.add` as the command name.

To add configs specific to certain commands, do the `.option()` call after *that* particular `.command()` call. If you want your configs to be global, add them before adding any other command.

### Example

```js
const command = require('sb-command')

command
  .version('0.0.1')
  .description('Git Versonal Control System')
  .option('--disable-cache', 'Disable Git Cache')
  .command('init', 'Initialize an empty repo', function(options) {
    console.log('git-init')
  })
  .option('--shallow-copy', 'Initialize with shallow copy')
  .command('add [file]', 'Add file contents to index', function(options, file) {
    console.log('git-add', files)
  })
  .option('--dry-run', 'Try to stage the file into git index but dont actually do it')
  .default(function(options, ...commands) {
    console.log(options, commands)
  })
  .process()

```

### API

```js
export class Command {
  default(callback: Function): this
  version(version: string): this
  description(descriptionText: string): this
  command(commandName: string, description: string, callback: ?Function): this
  option(option: string, description: string, defaultValue: any = null): this
  process(argv: Array<string> = process.argv): Promise<any>
  showHelp(): string
}
export default new command
```

## LICENSE

This package is licensed under the terms of MIT License. See the LICENSE file for more info.

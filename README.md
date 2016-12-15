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

### Example

```js
const command = require('sb-command')

command
  .version('0.0.1')
  .description('Git Versonal Control System')
  .command('init', 'Initialize an empty repo', function(options) {
    console.log('git-init')
  })
  .command('add [file]', 'Add file contents to index', function(options, file) {
    console.log('git-add', files)
  })
  .option('-v, --verbose', 'Enable verbosity', false)
  .option('-c, --config <key> <value>', 'Config')
  .default(function(options, ...commands) {
    console.log(options, commands)
  })
  .parse(process.argv)

```

### API

```js
export class Command {
  default(callback: Function): this
  version(version: string): this
  description(descriptionText: string): this
  command(commandName: string, description: string, callback: ?Function): this
  option(option: string, description: string, ...defaultValues): this
  parse(argv: Array<string>, soft: boolean = false): ?{
    options: Object,
    callback: ?Function,
    parameters: Array<string>,
    errorMessage: ?string,
  }
  showHelp(soft: boolean = false): string
}
export default new command
```

## LICENSE

This package is licensed under the terms of MIT License. See the LICENSE file for more info.

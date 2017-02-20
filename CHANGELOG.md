### 2.0.1

- Fix a bug where options would not be passed to callbacks correctly
- Fix a bug where parameters would be parsed in incorrect order for variadic
- Fix a bug where one value would be missed when command is found for variadic

### 2.0.0

- Release might be slightly unstable
- Correctly pass variadic parameters whenever appropriate
- Only support one parameter in an option instead of many
- Add support for multiple short parameters (`-abcde`)
- Add support for single chunk key-value (`--key=value`)
- Fix a bug where `-a` and `--a` are treated as same
- Fix help for subcommands
- Add support for per command options

### 1.0.0
 - Initial release

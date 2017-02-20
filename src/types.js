/* @flow */

export type Parameter = {
  type: 'optional' | 'required' | 'optional-variadic' | 'required-variadic',
  name: string,
}

export type Option = {
  command: ?string,
  aliases: Array<string>,
  parameter: ?Parameter,
  description: string,
  defaultValues: Array<any>
}

export type Command = {
  name: string,
  command: Array<string>,
  parameters: Array<Parameter>,
  description: string,
  callback: ?((command: string) => void)
}

// Reminder to self
// --help [something optiona] <required>
// help.get <name> [scope]

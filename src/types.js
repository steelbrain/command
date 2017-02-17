/* @flow */

export type Parameter = {
  type: 'optional-string' | 'required-string' | 'optional-string-variadic' | 'required-string-variadic',
  name: string,
}

export type Option = {
  aliases: Array<string>,
  parameters: Array<Parameter>,
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

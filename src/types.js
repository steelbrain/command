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
  defaultValue: any,
}

export type OptionEntry = {
  name: string,
  value: any,
  option: Option,
}

export type Command = {
  name: string,
  parameters: Array<Parameter>,
  description: string,
  callback: ?((command: string) => void)
}

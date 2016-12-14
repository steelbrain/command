/* @flow */

export type ParameterType = 'bool' | 'optional-string' | 'required-string' | 'optional-string-variadic' | 'required-string-variadic'
export type Option = { aliases: Array<string>, parameters: Array<ParameterType>, description: string, defaultValues: Array<any> }
export type Command = { command: Array<string>, parameters: Array<ParameterType>, description: string, callback: ?((command: string) => void) }

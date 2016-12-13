/* @flow */

import invariant from 'assert'
import * as Helpers from './helpers'
import type { ParameterType } from './types'

class CLI {
  options: Array<{ aliases: Array<string>, parameters: Array<ParameterType>, description: string, defaultValues: Array<any> }>;
  commands: Array<{ command: Array<string>, parameters: Array<ParameterType>, description: string, callback: ?((command: string) => void) }>;
  appVersion: string;
  constructor() {
    this.options = []
    this.commands = []
    this.appVersion = ''
  }
  version(version: string): this {
    invariant(version && typeof version === 'string', 'version must be a string')
    this.appVersion = version
    return this
  }
  command(givenCommand: string, description: string, callback: ?((command: string) => void) = null): this {
    invariant(typeof givenCommand === 'string', 'command must be a string')
    invariant(typeof description === 'string', 'description must be a string')
    invariant(!callback || typeof callback !== 'function', 'callback must be a function')

    const { command, parameters } = Helpers.parseCommand(givenCommand)
    if (this.commands.find(i => i.command.join('.') === command.join('.'))) {
      throw new Error(`parts of command '${givenCommand}' are already registered`)
    }
    this.commands.push({ command, parameters, description, callback })
    return this
  }
  option(option: string, description: string, ...defaultValues: Array<any>): this {
    invariant(typeof option === 'string', 'option must be a string')
    invariant(typeof description === 'string', 'description must be a string')

    const { aliases, parameters } = Helpers.parseOption(option)
    if (this.options.find(i => i.aliases.find(j => aliases.indexOf(j) !== -1))) {
      throw new Error(`parts of option '${option}' are already registered`)
    }
    this.options.push({ aliases, parameters, description, defaultValues })
    return this
  }
}

const cli = new CLI()
// $FlowIgnore: Custom property
cli.CLI = CLI

module.exports = cli

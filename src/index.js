/* @flow */

import invariant from 'assert'
import * as Helpers from './helpers'
import type { OptionType } from './types'

class CLI {
  params: Array<string>;
  options: Array<{ aliases: Array<string>, parameters: Array<OptionType>, description: string, defaultValues: Array<any> }>;
  commands: Array<{ command: Array<string>, description: string, callback: ?((command: string) => void) }>;
  appVersion: string;
  constructor(params: Array<string>) {
    Helpers.assertStringArray(params, 'params')
    this.appVersion = ''
    this.params = params
    this.commands = []
    this.options = []
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

    const command = Helpers.parseCommand(givenCommand)
    if (this.commands.find(i => i.command.join(Helpers.COMMAND_DELIMTER) === givenCommand)) {
      throw new Error(`command '${givenCommand}' is already registered`)
    }
    this.commands.push({ command, description, callback })
    return this
  }
  option(option: string, description: string, ...defaultValues: Array<any>): this {
    invariant(typeof option === 'string', 'option must be a string')
    invariant(typeof description === 'string', 'description must be a string')

    const { aliases, parameters } = Helpers.parseOption(option)
    if (this.options.find(i => i.aliases.find(j => aliases.indexOf(j) !== -1))) {
      throw new Error(`option '${option}' is already partially or fully registered`)
    }
    this.options.push({ aliases, parameters, description, defaultValues })
    return this
  }
}

const cli = new CLI(process.argv.slice(2))
// $FlowIgnore: Custom property
cli.of = function(params: Array<string>) {
  return new CLI(params)
}
// $FlowIgnore: Custom property
cli.CLI = CLI

module.exports = cli

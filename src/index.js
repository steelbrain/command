/* @flow */

import cliff from 'cliff'
import invariant from 'assert'
import camelCase from 'camelcase'
import parseArgv from './parser'
import * as Helpers from './helpers'
import type { Command as CommandType, Option, OptionEntry } from './types'

class Command {
  options: Array<Option>;
  commands: Array<CommandType>;
  appVersion: string;
  lastCommand: ?string;
  descriptionText: ?string;
  defaultCallback: ?Function;
  constructor() {
    this.options = []
    this.commands = []
    this.appVersion = ''
    this.lastCommand = ''
    this.descriptionText = ''
    this.defaultCallback = null

    this.option('--help', 'Print usage information')
    this.option('--version', 'Print version information')
  }
  default(callback: (() => void)): this {
    invariant(typeof callback === 'function', 'default callback must be a function')
    this.defaultCallback = callback
    return this
  }
  version(version: string): this {
    invariant(version && typeof version === 'string', 'version must be a string')
    this.appVersion = version
    return this
  }
  description(descriptionText: string): this {
    invariant(descriptionText && typeof descriptionText === 'string', 'descriptionText must be a string')
    this.descriptionText = descriptionText
    return this
  }
  command(givenCommand: string, description: string, callback: ?((command: string) => void) = null): this {
    invariant(typeof givenCommand === 'string', 'command must be a string')
    invariant(typeof description === 'string', 'description must be a string')
    invariant(!callback || typeof callback === 'function', 'callback must be a function')

    const { name, parameters } = Helpers.parseCommand(givenCommand)
    if (this.commands.find(i => i.name === name)) {
      throw new Error(`Command '${name}' is already registered`)
    }
    this.lastCommand = name
    this.commands.push({ name, parameters, description, callback })
    return this
  }
  option(option: string, description: string, defaultValue: any = null): this {
    invariant(typeof option === 'string', 'option must be a string')
    invariant(typeof description === 'string', 'description must be a string')

    const { aliases, parameter } = Helpers.parseOption(option)
    if (this.options.find(i => i.aliases.find(j => aliases.indexOf(j) !== -1))) {
      throw new Error(`parts of option '${option}' are already registered`)
    }
    this.options.push({ aliases, parameter, description, defaultValue, command: this.lastCommand })
    return this
  }
  parseArgv(given: Array<string>): {
    options: Array<OptionEntry>,
    command: ?CommandType,
    parameters: Array<string>,
  } {
    return parseArgv(given, this.commands, this.options)
  }
  showHelp(givenDisplayName: ?string = null, soft: boolean = false): string {
    const displayName = givenDisplayName || Helpers.getDisplayName(process.argv)
    const chunks = [
      `Usage: ${displayName}${this.commands.length ? ' [command...]' : ''}${this.options.length ? ' [options]' : ''}`,
    ]
    if (this.descriptionText) {
      chunks.push('')
      chunks.push(this.descriptionText)
    }
    if (this.options) {
      chunks.push('')
      chunks.push('Options:')
      const rows = []
      for (let i = 0, length = this.options.length; i < length; i++) {
        const option = this.options[i]
        const aliases = Helpers.sortOptionAliases(option.aliases.slice()).map(a => (a.length === 1 ? `-${a}` : `--${a}`))
        const parameters = Helpers.stringifyParameters(option.parameters, option.parameterNames)
        rows.push(['  ', aliases.join(', '), '  ', parameters.join(' '), '  ', option.description])
      }
      chunks.push(cliff.stringifyRows(rows))
    }
    if (this.commands) {
      chunks.push('')
      chunks.push('Commands:')
      const rows = []
      for (let i = 0, length = this.commands.length; i < length; i++) {
        const entry = this.commands[i]
        const parameters = Helpers.stringifyParameters(entry.parameters, entry.parameterNames)
        rows.push(['  ', entry.command.join(' '), '  ', parameters, '  ', entry.description])
      }
      chunks.push(cliff.stringifyRows(rows))
    }
    const helpText = chunks.join('\n')
    if (!soft) {
      console.log(helpText)
    }
    return helpText
  }
}

const command = new Command()
// $FlowIgnore: Custom property
command.Command = Command

module.exports = command

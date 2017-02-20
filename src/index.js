/* @flow */

import cliff from 'cliff'
import invariant from 'assert'
import camelCase from 'camelcase'
import parseArgv from './parser'
import * as Helpers from './helpers'
import type { Command as CommandType, Option } from './types'

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
    this.lastCommand = null
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
    options: Object,
    command: ?CommandType,
    parameters: Array<any>,
    rawParameters: Array<any>,
  } {
    const { options, command, parameters, rawParameters } = parseArgv(given, this.commands, this.options)
    const mergedOptions = {}
    options.forEach(function(entry) {
      entry.option.aliases.forEach(function(givenAlias) {
        const alias = givenAlias.slice(givenAlias.slice(0, 2) === '--' ? 2 : 1)
        mergedOptions[alias] = entry.value
        mergedOptions[camelCase(alias)] = entry.value
      })
    })
    return { options: mergedOptions, command, parameters, rawParameters }
  }
  process(argv: Array<string> = process.argv): Promise<void> {
    let result
    try {
      result = this.parseArgv(argv)
    } catch (error) {
      console.log('Error:', error.message)
      this.showHelp(argv, error.parameters || [])
      process.exit(1)
      return Promise.resolve()
      // ^ Necessary for flow
    }
    const { options, command, parameters, rawParameters } = result
    if (options.version) {
      console.log(this.appVersion)
      process.exit(0)
    } else if (options.help) {
      this.showHelp(argv, rawParameters)
      process.exit(0)
    } else if (!parameters.length && this.defaultCallback) {
      // $FlowIgnore: We validate that defaultCallback is not null here flow don't worry
      return new Promise(resolve => this.defaultCallback(resolve))
    } else if (!command || !command.callback) {
      if (parameters.length) {
        console.log('Error: Invalid subcommand', parameters[0])
      }
      this.showHelp(argv, rawParameters)
      process.exit(1)
      return Promise.resolve()
      // ^ Necessary for flow
    }
    return new Promise(function(resolve) {
      // $FlowIgnore: Command is not null here, flow thinks otherwise
      resolve(command.callback.apply(command, parameters))
    })
  }
  generateHelp(argv: Array<string> = process.argv, parameters: Array<any> = []): string {
    let chunks = [
      `Usage: ${Helpers.getDisplayName(argv)}${this.commands.length ? ' [command...]' : ''}${this.options.length ? ' [options]' : ''}`,
    ]
    if (this.descriptionText) {
      chunks.push('')
      chunks.push(this.descriptionText)
    }

    function appendOptions(options: Array<Option>) {
      chunks = chunks.concat(cliff.stringifyRows(options.map(function(option: Option) {
        const aliases = Helpers.sortAliases(option.aliases)
        const params = Helpers.stringifyParameters(option.parameter ? [option.parameter] : [])
        return ['  ', aliases.join(', '), '  ', params.join(' '), '  ', option.description]
      })))
    }

    if (this.options.length) {
      chunks.push('')
      chunks.push('Global Options:')
      appendOptions(this.options.filter(o => o.command === null))
    }

    const closestCommand = Helpers.getClosestCommand(this.commands, parameters)
    if (closestCommand) {
      const commandOptions = this.options.filter(o => o.command === closestCommand.name)
      if (commandOptions.length) {
        chunks.push('')
        chunks.push('Command Options:')
        appendOptions(commandOptions)
      }
    }

    let subCommands = this.commands
    if (closestCommand) {
      const closestCommandParams = Helpers.stringifyParameters(closestCommand.parameters)
      subCommands = subCommands.filter(c => c.name.startsWith(closestCommand.name) && c.name !== closestCommand.name)
      chunks[0] = `Usage: ${Helpers.getDisplayName(argv)} ${closestCommand.name.split('.').join(' ')}${closestCommandParams ? ` ${closestCommandParams.join(' ')}` : ''}${this.options.length ? ' [options]' : ''}`
      if (subCommands.length) {
        chunks[0] += `\nUsage: ${Helpers.getDisplayName(argv)} ${closestCommand.name.split('.').join(' ')}${subCommands.length ? ' [subcommand...]' : ''}${this.options.length ? ' [options]' : ''}`
      }
    }
    if (subCommands.length) {
      chunks.push('')
      chunks.push(`${closestCommand ? 'Subc' : 'C'}ommands:`)
      chunks = chunks.concat(cliff.stringifyRows(subCommands.map(function(command: CommandType) {
        const params = Helpers.stringifyParameters(command.parameters)
        return ['  ', command.name.split('.').join(' '), '  ', params.join(' '), '  ', command.description]
      })))
    }
    return chunks.join('\n')
  }
  showHelp(argv: Array<string> = process.argv, parameters: Array<any> = []): void {
    console.log(this.generateHelp(argv, parameters))
  }
}

const command = new Command()
// $FlowIgnore: Custom property
command.Command = Command

module.exports = command

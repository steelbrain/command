/* @flow */

import cliff from 'cliff'
import invariant from 'assert'
import camelCase from 'camelcase'
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

    const { name, command, parameters } = Helpers.parseCommand(givenCommand)
    if (this.commands.find(i => i.name === name)) {
      throw new Error(`Command '${name}' is already registered`)
    }
    this.lastCommand = name
    this.commands.push({ name, command, parameters, description, callback })
    return this
  }
  option(option: string, description: string, ...defaultValues: Array<any>): this {
    invariant(typeof option === 'string', 'option must be a string')
    invariant(typeof description === 'string', 'description must be a string')

    const { aliases, parameters } = Helpers.parseOption(option)
    if (this.options.find(i => i.aliases.find(j => aliases.indexOf(j) !== -1))) {
      throw new Error(`parts of option '${option}' are already registered`)
    }
    this.options.push({ aliases, parameters, description, defaultValues, command: this.lastCommand })
    return this
  }
  parse(argv: Array<string>, soft: boolean = false): ?{
    options: Object,
    callback: ?Function,
    parameters: Array<string>,
    errorMessage: ?string,
  } {
    let lastOption = null
    let errorMessage = null
    const rawNonOptions = []
    const rawOptions = []

    // NOTE: This is the option and non-option extraction from argv part
    // NOTE: We skip the first two because of the struct of process.argv
    for (let i = 2, length = argv.length; i < length; i++) {
      const chunk = argv[i]
      if (chunk.slice(0, 1) === '-') {
        if (lastOption) {
          if (Helpers.option.requiresMore(lastOption)) {
            errorMessage = `Invalid value for option '${lastOption.name}'`
            break
          }
          rawOptions.push(lastOption)
        }
        lastOption = Helpers.option.getOption(this.options, chunk)
      } else if (lastOption && Helpers.option.acceptsMore(lastOption)) {
        lastOption.values.push(chunk)
      } else rawNonOptions.push(chunk)
    }
    if (lastOption) {
      if (Helpers.option.requiresMore(lastOption)) {
        errorMessage = `Invalid value for option '${lastOption.name}'`
      } else {
        rawOptions.push(lastOption)
      }
    }

    const options = {}
    for (let i = 0, length = this.options.length; i < length; i++) {
      const option = this.options[i]
      for (let j = 0, jlength = option.aliases.length; j < jlength; j++) {
        options[camelCase(option.aliases[j])] = Helpers.option.singlify(option.parameters, option.defaultValues)
      }
    }
    for (let i = 0, length = rawOptions.length; i < length; i++) {
      const option = rawOptions[i]
      const values = option.parameters[0] === 'bool' ? [true] : option.values
      for (let j = values.length, jlength = option.defaultValues.length; j < jlength; j++) {
        values[j] = option.defaultValues[j]
      }
      for (let j = 0, jlength = option.aliases.length; j < jlength; j++) {
        // eslint-disable-next-line no-param-reassign
        options[camelCase(option.aliases[j])] = Helpers.option.singlify(option.parameters, values)
      }
    }

    let commandCallback = null
    let commandParameters = []

    // When there's no extra command name or the first name of the user requested command doesn't exist
    if (!rawNonOptions.length || !this.commands.find(c => c.command[0] === rawNonOptions[0])) {
      commandCallback = this.defaultCallback
      commandParameters = rawNonOptions
    } else {
      let closest
      for (let i = 0, length = this.commands.length; i < length; i++) {
        const entry = this.commands[i]
        if (entry.command.join('.') === rawNonOptions.slice(0, entry.command.length).join('.')) {
          if (!closest || entry.command.length > closest.command.length) {
            closest = entry
          }
        }
      }
      if (closest) {
        commandCallback = closest.callback
        commandParameters = rawNonOptions.slice(closest.command.length)
        if (commandParameters.length < closest.parameters.filter(i => ~i.indexOf('required')).length) {
          errorMessage = `Not enough parameters for command: ${closest.command.join('.')}`
        }
      }
    }

    if (soft) {
      return {
        options,
        callback: commandCallback,
        parameters: commandParameters,
        errorMessage,
      }
    }

    if (errorMessage) {
      console.log(`Error: ${errorMessage}`)
    }
    if (!errorMessage && options.version) {
      console.log(this.appVersion)
      process.exit(0)
    }
    if (errorMessage || options.help || !commandCallback) {
      this.showHelp(Helpers.getDisplayName(argv))
      process.exit(1)
    } else {
      commandCallback.apply(null, [options].concat(commandParameters))
    }
    return null
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

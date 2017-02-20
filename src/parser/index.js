/* @flow */

import type { Command, Option, OptionEntry } from '../types'

const OPTION_SHORT_MULTI = /^-([a-z0-9]{2,})$/i
const OPTION_COMPRESSED = /^(--[a-z0-9]+)=(.+)$|^(-[a-z0-9]+)=(.+)$/i

function getOptionByAlias(options: Array<Option>, alias: string): Option {
  const foundOption = options.find(option => option.aliases.indexOf(alias) !== -1)
  if (foundOption) {
    return foundOption
  }
  throw new Error(`Option ${alias} is not recognized`)
}

export default function parse(given: Array<string>, commands: Array<Command>, options: Array<Option>): {
  options: Array<OptionEntry>,
  command: ?Command,
  parameters: Array<string>,
} {
  let parsedParameters = []
  const rawParameters = []
  const parsedOptions = []

  let lastOption: ?OptionEntry = null
  const argv = given.slice(2)
  for (let i = 0, length = argv.length; i < length; i++) {
    const chunk = argv[i]
    if (chunk === '--') {
      parsedParameters = parsedParameters.concat(argv.slice(i + 1))
      break
    }
    if (chunk.startsWith('-')) {
      if (lastOption) {
        if (lastOption.option.parameter && !lastOption.value) {
          throw new Error(`Option ${chunk} expects a value`)
        }
        parsedOptions.push(lastOption)
        lastOption = null
      }
      if (OPTION_SHORT_MULTI.test(chunk)) {
        // Expand -asd to -a -s -d in argv
        const matched = OPTION_SHORT_MULTI.exec(chunk)
        argv.splice(i, 1, ...matched[1].split('').map(e => `-${e}`))
        i--
        continue
      }
      if (OPTION_COMPRESSED.test(chunk)) {
        // Expand --bee=sea / -a=b to [--bee, sea]
        const matched = OPTION_COMPRESSED.exec(chunk)
        argv.splice(i, 1, matched[1] || matched[3], matched[2] || matched[4])
        i--
        continue
      }
      lastOption = {
        name: chunk,
        value: null,
        option: getOptionByAlias(options, chunk),
      }
    } else {
      if (!lastOption) {
        rawParameters.push(chunk)
        continue
      }
      if (lastOption.option.parameter && !lastOption.value) {
        lastOption.value = chunk
        parsedOptions.push(lastOption)
        lastOption = null
      } else {
        rawParameters.push(chunk)
      }
    }
  }
  if (lastOption) {
    if (lastOption.option.parameter && !lastOption.value) {
      throw new Error(`Option ${lastOption.name} expects a value`)
    }
    parsedOptions.push(lastOption)
  }

  // Process the bool options
  for (let i = 0, length = parsedOptions.length; i < length; i++) {
    const entry = parsedOptions[i]
    if (!entry.option.parameter) {
      entry.value = true
    }
  }

  let command = null
  for (let i = rawParameters.length; i--;) {
    const currentName = rawParameters.slice(0, i + 1).join('.')
    command = commands.find(entry => entry.name === currentName)
    if (command) {
      parsedParameters.unshift(...rawParameters.slice(i + 1))
      break
    }
  }

  if (command) {
    let notEnough = false
    let parameterIndex = 0
    for (let i = 0, length = command.parameters.length; i < length; i++) {
      const parameter = command.parameters[i]
      const value = parsedParameters[parameterIndex]
      if (!value && parameter.type.startsWith('required')) {
        notEnough = true
        break
      } else if (parameter.type.endsWith('variadic')) {
        parameterIndex = parsedParameters.length
        break
      } else if (value) {
        parameterIndex++
      }
    }
    if (notEnough) {
      throw new Error(`Not enough parameters for command: ${command.name.split('.').join(' ')}`)
    } else if (parameterIndex < parsedParameters.length) {
      throw new Error(`Too many parameters for command: ${command.name.split('.').join(' ')}`)
    }
    // TODO: Validation and filling
  }
  // TODO: fill default option values

  return {
    options: parsedOptions,
    command,
    parameters: parsedParameters,
  }
}

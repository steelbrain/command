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

// TODO: --a !== -a
export default function parse(given: Array<string>, commands: Array<Command>, options: Array<Option>): {
  options: Array<OptionEntry>,
  command: null,
  parameters: Array<string>,
} {
  let command
  let parsedParameters = []
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
        parsedParameters.push(chunk)
        continue
      }
      if (lastOption.option.parameter && !lastOption.value) {
        lastOption.value = chunk
        parsedOptions.push(lastOption)
        lastOption = null
      } else {
        parsedParameters.push(chunk)
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

  // TODO: Find out the command and see if the parameters are valid

  return {
    options: parsedOptions,
    command: null,
    // TODO: Replace with real command
    parameters: parsedParameters,
  }
}

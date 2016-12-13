/* @flow */

import invariant from 'assert'
import type { OptionType } from './types'

const COMMAND_REGEX = /^[a-z\-\._]+$/i
const OPTION_NAME_SHORT = /^\-(\w)$/
const OPTION_NAME_LONG = /^\-\-(\w+)$/
const OPTION_STRING_REQUIRED = /<\S+>/
const OPTION_STRING_OPTIONAL = /\[\S+\]/
const OPTION_STRING_REQUIRED_VARIDIAC = /<\S+ *\.\.\.>/
const OPTION_STRING_OPTIONAL_VARIDIAC = /\[\S+ *\.\.\.\]/
export const COMMAND_DELIMTER = '.'

export function parseCommand(command: string): Array<string> {
  const errorMessage = `command '${command}' is invalid`
  if (!COMMAND_REGEX.test(command)) {
    throw new Error(errorMessage)
  }

  const toReturn = []
  const chunks = command.split(COMMAND_DELIMTER)
  for (let i = 0, length = chunks.length; i < length; i++) {
    const chunk = chunks[i]
    if (!chunk.length) {
      throw new Error(errorMessage)
    }
    toReturn.push(chunk)
  }
  return toReturn
}

export function parseOption(option: string): { aliases: Array<string>, parameters: Array<OptionType> } {
  let optionsDone = false
  const chunks = option.split(/,\s+|,|\s+/)
  const aliases = []
  const parameters = []
  const errorMessage = `option '${option}' is invalid`

  for (let i = 0, length = chunks.length; i < length; i++) {
    const chunk = chunks[i].trim()
    if (!optionsDone) {
      if (OPTION_NAME_SHORT.test(chunk)) {
        aliases.push(chunk)
      } else if (OPTION_NAME_LONG.test(chunk)) {
        aliases.push(chunk)
      } else {
        optionsDone = true
      }
    }

    if (optionsDone) {
      if (OPTION_STRING_REQUIRED.test(chunk)) {
        parameters.push('required-string')
      } else if (OPTION_STRING_OPTIONAL.test(chunk)) {
        parameters.push('optional-string')
      } else if (OPTION_STRING_REQUIRED_VARIDIAC.test(chunk)) {
        parameters.push('required-string-variadic')
      } else if (OPTION_STRING_OPTIONAL_VARIDIAC.test(chunk)) {
        parameters.push('optional-string-variadic')
      } else throw new Error(errorMessage)
    }
  }
  if (!aliases.length) {
    throw new Error(errorMessage)
  }

  return {
    aliases,
    parameters: parameters.length ? parameters : ['bool'],
  }
}

export function assertStringArray(array: Array<string>, displayName: string): void {
  invariant(Array.isArray(array), `${displayName} must be an Array`)
  for (let i = 0, length = array.length; i < length; i++) {
    invariant(typeof array[i] === 'string', `${displayName}[${i}] must be a string`)
  }
}

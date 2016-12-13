/* @flow */

import invariant from 'assert'
import type { ParameterType } from './types'

const DELIMETER = /,\s+|,|\s+/
const OPTION_NAME_SHORT = /^\-(\w)$/
const OPTION_NAME_LONG = /^\-\-(\w+)$/
const OPTION_STRING_REQUIRED = /<\S+>/
const OPTION_STRING_OPTIONAL = /\[\S+\]/
const OPTION_STRING_REQUIRED_VARIDIAC = /<\S+ *\.\.\.>/
const OPTION_STRING_OPTIONAL_VARIDIAC = /\[\S+ *\.\.\.\]/

export function getParameterType(chunk: string): ?ParameterType {
  switch (true) {
    case OPTION_STRING_REQUIRED.test(chunk):
      return 'required-string'
    case OPTION_STRING_OPTIONAL.test(chunk):
      return 'optional-string'
    case OPTION_STRING_REQUIRED_VARIDIAC.test(chunk):
      return 'required-string-variadic'
    case OPTION_STRING_OPTIONAL_VARIDIAC.test(chunk):
      return 'optional-string-variadic'
    default:
      return null
  }
}

export function parseCommand(givenCommand: string): { command: Array<string>, parameters: Array<ParameterType> } {
  let command = []
  const chunks = givenCommand.split(DELIMETER).filter(i => i)
  const parameters = []
  const errorMessage = `command '${givenCommand}' is invalid`

  for (let i = 0, length = chunks.length; i < length; i++) {
    const chunk = chunks[i].trim()
    if (i === 0) {
      // First is always command
      command = command.concat(chunk.split('.').filter(j => j))
    } else {
      const parameterType = getParameterType(chunk)
      if (parameterType) {
        parameters.push(parameterType)
      } else throw new Error(errorMessage)
    }
  }
  if (!command.length) {
    throw new Error(errorMessage)
  }

  return {
    command,
    parameters,
  }
}

export function parseOption(option: string): { aliases: Array<string>, parameters: Array<ParameterType> } {
  let aliasesDone = false
  const chunks = option.split(DELIMETER).filter(i => i)
  const aliases = []
  const parameters = []
  const errorMessage = `option '${option}' is invalid`

  for (let i = 0, length = chunks.length; i < length; i++) {
    const chunk = chunks[i].trim()
    if (!aliasesDone) {
      if (OPTION_NAME_SHORT.test(chunk)) {
        aliases.push(chunk)
      } else if (OPTION_NAME_LONG.test(chunk)) {
        aliases.push(chunk)
      } else {
        aliasesDone = true
      }
    }

    if (aliasesDone) {
      const parameterType = getParameterType(chunk)
      if (parameterType) {
        parameters.push(parameterType)
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

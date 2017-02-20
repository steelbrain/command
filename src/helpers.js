/* @flow */

import Path from 'path'
import type { Parameter } from './types'

export function getDisplayName(argv: Array<string>): string {
  return Path.basename(argv[1] || 'node')
}

export const DELIMETER = /,\s+|,|\s+/
// ^ command with space or comma or space
export const OPTION_NAME = /^(--[a-z0-9-]+)$|^(-[a-z0-9]+)$/i
// ^ Include - or -- in captured to distinguish between two
export const PARAM_STRING_REQUIRED = /^<(\S+)>$/
export const PARAM_STRING_OPTIONAL = /^\[(\S+)\]$/
export const PARAM_STRING_REQUIRED_VARIADIC = /^<(\S+) *\.\.\.>$/
export const PARAM_STRING_OPTIONAL_VARIADIC = /^\[(\S+) *\.\.\.\]$/

export function parseParameter(chunk: string): ?Parameter {
  let name
  switch (true) {
    case PARAM_STRING_REQUIRED_VARIADIC.test(chunk):
      name = PARAM_STRING_REQUIRED_VARIADIC.exec(chunk)[1]
      return { type: 'required-variadic', name }
    case PARAM_STRING_REQUIRED.test(chunk):
      name = PARAM_STRING_REQUIRED.exec(chunk)[1]
      return { type: 'required', name }
    case PARAM_STRING_OPTIONAL_VARIADIC.test(chunk):
      name = PARAM_STRING_OPTIONAL_VARIADIC.exec(chunk)[1]
      return { type: 'optional-variadic', name }
    case PARAM_STRING_OPTIONAL.test(chunk):
      name = PARAM_STRING_OPTIONAL.exec(chunk)[1]
      return { type: 'optional', name }
    default:
      return null
  }
}

export function stringifyParameters(parameters: Array<Parameter>): Array<string> {
  const wrappers = {
    optional: ['[', ']'],
    required: ['<', '>'],
  }
  return parameters.map(function(parameter) {
    const type = parameter.type.startsWith('optional') ? 'optional' : 'required'
    return `${wrappers[type][0]}${parameter.name}${wrappers[type][1]}`
  })
}

export function validateParameterPosition(parameter: Parameter, index: number, parameters: Array<Parameter>, chunks: Array<string>, prefix: string): void {
  if (parameter.type.startsWith('required')) {
    const previousOptional = parameters.filter(i => i.type.startsWith('optional'))
    if (previousOptional.length) {
      throw new Error(`${prefix} because required parameter cannot appear after optional`)
    }
  }
  if (parameter.type.endsWith('variadic')) {
    if (index !== chunks.length - 1) {
      throw new Error(`${prefix} because variadic must only appear at the end`)
    }
  }
}

export function parseCommand(given: string): { name: string, parameters: Array<Parameter> } {
  let name
  const chunks = given.trim().split(DELIMETER)
  const parameters = []
  const errorMessage = `Command '${given}' is invalid`

  chunks.forEach(function(chunk, index) {
    if (index === 0) {
      name = chunk
      return
    }
    const parsed = parseParameter(chunk)
    if (!parsed) {
      throw new Error(errorMessage)
    }
    validateParameterPosition(parsed, index, parameters, chunks, errorMessage)
    parameters.push(parsed)
  })
  if (!name) {
    throw new Error(errorMessage)
  }

  return {
    name,
    parameters,
  }
}

// NOTE: Stores - or -- in the aliases
export function parseOption(option: string): { aliases: Array<string>, parameter: ?Parameter } {
  const chunks = option.trim().split(DELIMETER)
  const aliases = []
  const errorMessage = `Option '${option}' is invalid`
  let parameter
  let processingAliases = true

  chunks.forEach(function(chunk) {
    if (OPTION_NAME.test(chunk)) {
      if (!processingAliases) {
        throw new Error(`${errorMessage} because aliases must not appear after options`)
      }
      const matched = OPTION_NAME.exec(chunk)
      aliases.push(matched[1] || matched[2])
      return
    }
    if (processingAliases) {
      processingAliases = false
    }
    const parsed = parseParameter(chunk)
    if (!parsed) {
      throw new Error(errorMessage)
    }
    if (parsed.type.endsWith('variadic')) {
      throw new Error(`${errorMessage} because an option must not have variadic parameters`)
    }
    if (parameter) {
      throw new Error(`${errorMessage} because an option must not have more than one parameter`)
    }
    parameter = parsed
  })

  if (!aliases.length) {
    throw new Error(errorMessage)
  }

  return {
    aliases,
    parameter: parameter || null,
  }
}

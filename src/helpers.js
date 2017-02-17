/* @flow */

import Path from 'path'
import invariant from 'assert'
import type { Option, Parameter } from './types'

export function getDisplayName(argv: Array<string>): string {
  return Path.basename(argv[1] || 'node')
}

export const DELIMETER = /,\s+|,|\s+/
// ^ command with space or comma or space
export const OPTION_NAME = /^\-\-(.*)|\-(.*)$/
export const PARAM_STRING_REQUIRED = /^<(\S+)>$/
export const PARAM_STRING_OPTIONAL = /^\[(\S+)\]$/
export const PARAM_STRING_REQUIRED_VARIADIC = /^<(\S+) *\.\.\.>$/
export const PARAM_STRING_OPTIONAL_VARIADIC = /^\[(\S+) *\.\.\.\]$/

export function parseParameter(chunk: string): ?Parameter {
  let name
  switch (true) {
    case PARAM_STRING_REQUIRED.test(chunk):
      name = PARAM_STRING_REQUIRED.exec(chunk)[1]
      return { type: 'required-string', name }
    case PARAM_STRING_OPTIONAL.test(chunk):
      name = PARAM_STRING_OPTIONAL.exec(chunk)[1]
      return { type: 'optional-string', name }
    case PARAM_STRING_REQUIRED_VARIADIC.test(chunk):
      name = PARAM_STRING_REQUIRED_VARIADIC.exec(chunk)[1]
      return { type: 'required-string-variadic', name }
    case PARAM_STRING_OPTIONAL_VARIADIC.test(chunk):
      name = PARAM_STRING_OPTIONAL_VARIADIC.exec(chunk)[1]
      return { type: 'optional-string-variadic', name }
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

export function parseCommand(given: string): { name: string, command: Array<string>, parameters: Array<Parameter> } {
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
    command: name.split('.'),
    parameters,
  }
}

export function parseOption(option: string): { aliases: Array<string>, parameters: Array<Parameter> } {
  const chunks = option.trim().split(DELIMETER)
  const aliases = []
  const parameters = []
  const errorMessage = `Option '${option}' is invalid`
  let processingAliases = true

  chunks.forEach(function(chunk, index) {
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
    validateParameterPosition(parsed, index, parameters, chunks, errorMessage)
    parameters.push(parsed)
  })

  if (!aliases.length) {
    throw new Error(errorMessage)
  }

  return {
    aliases,
    parameters,
  }
}

function something() {
  const option = {
    getOption(options: Array<Option>, givenName: string): Object {
      const matched = OPTION_NAME.exec(givenName)
      const name = matched[1] || matched[2]
      const found = options.find(entry => entry.aliases.find(i => i === name))
      if (found) {
        return {
          name,
          values: [],
          aliases: found.aliases,
          parameters: found.parameters,
          defaultValues: found.defaultValues,
        }
      }
      // For unknown options
      return {
        name,
        values: [],
        aliases: [name],
        parameters: ['unknown'],
        defaultValues: [],
      }
    },
    acceptsMore(lastOption: Object): boolean {
      if (!lastOption) {
        return false
      }
      return !!(lastOption.values.length !== lastOption.parameters.length ||
             ~lastOption.parameters[lastOption.parameters.length - 1].indexOf('variadic'))
    },
    requiresMore(lastOption: Object): boolean {
      if (!lastOption) {
        return false
      }
      const parameter = lastOption.parameters[0]
      if (parameter === 'unknown' || parameter === 'bool') {
        return false
      }
      return lastOption.values.length < lastOption.parameters.filter(i => ~i.indexOf('required')).length
    },
    singlify(parameters: Array<ParameterType>, values: Array<any>): any {
      const parameter = parameters[0]
      if (parameters.length === 1 && (parameter === 'bool' || !~parameter.indexOf('variadic'))) {
        return values[0]
      }
      return values
    },
  }
}

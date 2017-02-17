/* @flow */

import Path from 'path'
import invariant from 'assert'
import type { Option, Parameter } from './types'

export function getDisplayName(argv: Array<string>): string {
  return Path.basename(argv[1] || 'node')
}

export const DELIMETER = /,\s+|,|\s+/
// ^ command with space or comma or space
export const PARAM_NAME = /^\-\-(.*)|\-(.*)$/
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

export function parseCommand(given: string): { name: string, command: Array<string>, parameters: Array<Parameter> } {
  let name
  const chunks = given.trim().split(DELIMETER)
  const parameters = []
  const errorMessage = `command '${given}' is invalid`

  chunks.forEach(function(chunk, index) {
    if (index === 0) {
      name = chunk
      return
    }
    const parsed = parseParameter(chunk)
    if (!parsed) {
      throw new Error(errorMessage)
    }
    if (parsed.type.startsWith('required')) {
      const previousOptional = parameters.filter(i => i.type.startsWith('optional'))
      if (previousOptional.length) {
        throw new Error(`${errorMessage} because required parameter cannot appear after optional`)
      }
    }
    if (parsed.type.endsWith('variadic')) {
      if (index !== chunks.length - 1) {
        throw new Error(`${errorMessage} because variadic should only appear at the end`)
      }
    }
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


function something() {
  function parseOption(option: string): { aliases: Array<string>, parameters: Array<ParameterType>, parameterNames: Array<string> } {
    let aliasesDone = false
    const chunks = option.split(DELIMETER).filter(i => i)
    const aliases = []
    const parameters = []
    const parameterNames = []
    const errorMessage = `option '${option}' is invalid`

    for (let i = 0, length = chunks.length; i < length; i++) {
      const chunk = chunks[i].trim()
      if (!aliasesDone) {
        if (OPTION_NAME.test(chunk)) {
          const matched = OPTION_NAME.exec(chunk)
          aliases.push(matched[1] || matched[2])
        } else {
          aliasesDone = true
        }
      }

      if (aliasesDone) {
        const parameterInfo = getParameterType(chunk)
        if (parameterInfo) {
          if (!validateParameterPosition(parameterInfo.type, parameters[parameters.length - 1])) {
            throw new Error(`${errorMessage} because required parameter cannot appear after optional`)
          }
          parameters.push(parameterInfo.type)
          parameterNames.push(parameterInfo.name)
        } else throw new Error(errorMessage)
      }
    }
    if (!aliases.length) {
      throw new Error(errorMessage)
    }
    if (!validateVariadic(parameters)) {
      throw new Error(`${errorMessage} because variadic should only appear at the end`)
    }

    console.log(aliases, parameters, parameterNames)
    return {
      aliases,
      parameters: parameters.length ? parameters : ['bool'],
      parameterNames,
    }
  }

  function assertStringArray(array: Array<string>, displayName: string): void {
    invariant(Array.isArray(array), `${displayName} must be an Array`)
    for (let i = 0, length = array.length; i < length; i++) {
      invariant(typeof array[i] === 'string', `${displayName}[${i}] must be a string`)
    }
  }

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

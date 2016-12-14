/* @flow */

import invariant from 'assert'
import type { Option, ParameterType } from './types'

export const DELIMETER = /,\s+|,|\s+/
export const OPTION_NAME = /^\-\-(.*)|\-(.*)$/
export const OPTION_STRING_REQUIRED = /<\S+>/
export const OPTION_STRING_OPTIONAL = /\[\S+\]/
export const OPTION_STRING_REQUIRED_VARIADIC = /<\S+ *\.\.\.>/
export const OPTION_STRING_OPTIONAL_VARIADIC = /\[\S+ *\.\.\.\]/

export function getParameterType(chunk: string): ?ParameterType {
  switch (true) {
    case OPTION_STRING_REQUIRED.test(chunk):
      return 'required-string'
    case OPTION_STRING_OPTIONAL.test(chunk):
      return 'optional-string'
    case OPTION_STRING_REQUIRED_VARIADIC.test(chunk):
      return 'required-string-variadic'
    case OPTION_STRING_OPTIONAL_VARIADIC.test(chunk):
      return 'optional-string-variadic'
    default:
      return null
  }
}

export function validateVariadic(parameters: Array<ParameterType>): boolean {
  for (let i = 0, length = parameters.length; i < length; i++) {
    if (parameters[i] === 'required-string-variadic' || parameters[i] === 'optional-string-variadic') {
      if (i !== length) {
        return false
      }
    }
  }
  return true
}
export function validateParameterPosition(current: ParameterType, last: ParameterType): boolean {
  return !(~current.indexOf('required') && last && ~last.indexOf('optional'))
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
        if (!validateParameterPosition(parameterType, parameters[parameters.length - 1])) {
          throw new Error(`${errorMessage} because required parameter cannot appear after optional`)
        }
        parameters.push(parameterType)
      } else throw new Error(errorMessage)
    }
  }
  if (!command.length) {
    throw new Error(errorMessage)
  }
  if (!validateVariadic(parameters)) {
    throw new Error(`${errorMessage} because variadic should only appear at the end`)
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
      if (OPTION_NAME.test(chunk)) {
        const matched = OPTION_NAME.exec(chunk)
        aliases.push(matched[1] || matched[2])
      } else {
        aliasesDone = true
      }
    }

    if (aliasesDone) {
      const parameterType = getParameterType(chunk)
      if (parameterType) {
        if (!validateParameterPosition(parameterType, parameters[parameters.length - 1])) {
          throw new Error(`${errorMessage} because required parameter cannot appear after optional`)
        }
        parameters.push(parameterType)
      } else throw new Error(errorMessage)
    }
  }
  if (!aliases.length) {
    throw new Error(errorMessage)
  }
  if (!validateVariadic(parameters)) {
    throw new Error(`${errorMessage} because variadic should only appear at the end`)
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

export const option = {
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

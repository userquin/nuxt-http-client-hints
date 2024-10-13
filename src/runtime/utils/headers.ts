export function writeClientHintHeaders(headerNames: string[], key: string, headers: Record<string, string[]>) {
  headerNames.forEach((header) => {
    headers[header] = (headers[header] ? headers[header] : []).concat(key)
  })
}

export type GetHeaderType = 'string' | 'int' | 'float' | 'boolean'
type GetHeaderReturnType<T extends GetHeaderType> = T extends 'string'
  ? string
  : T extends 'int'
    ? number
    : T extends 'float'
      ? number
      : T extends 'boolean'
        ? boolean
        : never

export function lookupHeader<T extends GetHeaderType>(
  type: T,
  key: Lowercase<string>,
  headers: { [key in Lowercase<string>]?: string | undefined },
): GetHeaderReturnType<T> | undefined {
  const value = headers[key]
  if (!value)
    return undefined

  if (type === 'string')
    return value as GetHeaderReturnType<T>

  if (type === 'int' || type === 'float') {
    try {
      const numberValue = type === 'int'
        ? Number.parseInt(value)
        : Number.parseFloat(value)
      return Number.isNaN(numberValue)
        ? undefined
        : numberValue as GetHeaderReturnType<T>
    }
    catch {
      return undefined
    }
  }

  if (type === 'boolean') {
    const booleanValue = value === '?1'
    return booleanValue as GetHeaderReturnType<T>
  }

  return undefined
}

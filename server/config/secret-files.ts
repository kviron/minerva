const DEFAULT_MAX_SECRET_BYTES = 65_536

type Environment = Readonly<Record<string, string | undefined>>
type ReadSecretFile = (path: string) => string

export class SecretFileConfigurationError extends Error {
  constructor(key: string) {
    super(`Invalid secret file configuration for ${key}`)
    this.name = 'SecretFileConfigurationError'
  }
}

const removeSingleTrailingLineEnding = (value: string): string => value.endsWith('\r\n')
  ? value.slice(0, -2)
  : value.endsWith('\n')
    ? value.slice(0, -1)
    : value

export const resolveSecretFileValues = (
  input: Environment,
  keys: readonly string[],
  readFile: ReadSecretFile,
  maxSecretBytes = DEFAULT_MAX_SECRET_BYTES,
): Record<string, string | undefined> => {
  const resolved: Record<string, string | undefined> = { ...input }

  for (const key of keys) {
    const fileKey = `${key}_FILE`
    const directValue = input[key]
    const filePath = input[fileKey]
    if (directValue !== undefined && filePath !== undefined) {
      throw new SecretFileConfigurationError(key)
    }
    if (filePath === undefined) continue
    if (filePath.length === 0) throw new SecretFileConfigurationError(key)

    try {
      const content = readFile(filePath)
      if (Buffer.byteLength(content, 'utf8') > maxSecretBytes) {
        throw new SecretFileConfigurationError(key)
      }
      resolved[key] = removeSingleTrailingLineEnding(content)
    }
    catch (error: unknown) {
      if (error instanceof SecretFileConfigurationError) throw error
      throw new SecretFileConfigurationError(key)
    }
  }

  return resolved
}


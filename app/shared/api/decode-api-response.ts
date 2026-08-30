import type { z } from 'zod'

export class InvalidApiResponseError extends Error {
  constructor(
    readonly endpoint: string,
    readonly issues: readonly Readonly<{ code: string, path: readonly (string | number)[] }>[],
  ) {
    super(`Invalid API response: ${endpoint}`)
    this.name = 'InvalidApiResponseError'
  }
}

export const decodeApiResponse = <Schema extends z.ZodTypeAny>(
  schema: Schema,
  value: unknown,
  endpoint: string,
): z.infer<Schema> => {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new InvalidApiResponseError(endpoint, parsed.error.issues.map(issue => ({
      code: issue.code,
      path: [...issue.path],
    })))
  }
  return parsed.data
}

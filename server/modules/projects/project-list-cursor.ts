import { z } from 'zod'

const cursorPayloadSchema = z.object({
  updatedAt: z.string().datetime(),
  id: z.string().uuid(),
}).strict()

export interface ProjectListCursor {
  readonly updatedAt: Date
  readonly id: string
}

export const encodeProjectListCursor = (cursor: ProjectListCursor): string => Buffer.from(JSON.stringify({
  updatedAt: cursor.updatedAt.toISOString(),
  id: cursor.id,
})).toString('base64url')

export const decodeProjectListCursor = (value: string | undefined): ProjectListCursor | null => {
  if (value === undefined) return null
  const parsed = cursorPayloadSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  return { updatedAt: new Date(parsed.updatedAt), id: parsed.id }
}

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { decodeApiResponse, InvalidApiResponseError } from '../../../../app/shared/api/decode-api-response'

describe('decodeApiResponse', () => {
  it('returns schema-validated data', () => {
    const schema = z.object({ id: z.string().uuid() }).strict()
    expect(decodeApiResponse(schema, { id: '21b9fc31-6e20-4399-a2ea-fb4de1024821' }, 'GET /api/test')).toEqual({
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
    })
  })

  it('throws a safe contextual error without including response values', () => {
    const schema = z.object({ id: z.string().uuid() }).strict()
    const privateValue = 'postgres://secret@private-host/minerva'

    expect(() => decodeApiResponse(schema, { id: privateValue }, 'GET /api/test')).toThrow(InvalidApiResponseError)

    try {
      decodeApiResponse(schema, { id: privateValue }, 'GET /api/test')
    }
    catch (error) {
      expect(error).toMatchObject({ endpoint: 'GET /api/test', message: 'Invalid API response: GET /api/test' })
      expect(error).toMatchObject({ issues: [{ code: 'invalid_string', path: ['id'] }] })
      expect(String(error)).not.toContain(privateValue)
    }
  })
})

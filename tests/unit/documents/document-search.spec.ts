import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  buildDocumentSearchExcerpt,
  extractDocumentSearchText,
  normalizeDocumentSearchQuery,
} from '../../../server/modules/documents/search-documents'
import { searchDocumentsBodySchema } from '../../../server/modules/documents/http-schemas'

describe('document search', () => {
  it('extracts normalized visible text from nested Tiptap content in reading order', () => {
    expect(extractDocumentSearchText({
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: '  Настройка API  ' }] },
        {
          type: 'bulletList',
          content: [{
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Токены доступа' }] }],
          }],
        },
        { type: 'image', attrs: { imageId: '00000000-0000-4000-8000-000000000001', alt: 'Схема запросов' } },
      ],
    })).toBe('Настройка API Токены доступа Схема запросов')
  })

  it('normalizes queries and returns a bounded excerpt around the first matching term', () => {
    expect(normalizeDocumentSearchQuery('  ТОКЕНЫ   доступа  ')).toBe('токены доступа')
    const excerpt = buildDocumentSearchExcerpt(
      'Введение. Для интеграции используются токены доступа с ограниченным сроком действия.',
      'токены доступа',
      48,
    )
    expect(excerpt).toContain('токены доступа')
    expect(excerpt.length).toBeLessThanOrEqual(49)
  })

  it('keeps search terms in a strict no-store POST body', async () => {
    expect(searchDocumentsBodySchema.safeParse({ query: 'архитектура' }).success).toBe(true)
    expect(searchDocumentsBodySchema.safeParse({ query: '', actorUserId: 'forbidden' }).success).toBe(false)
    expect(searchDocumentsBodySchema.safeParse({ query: 'x'.repeat(201) }).success).toBe(false)

    const source = await readFile('server/api/projects/[id]/documents/search.post.ts', 'utf8')
    expect(source).toContain('readBody(event)')
    expect(source).toContain("setHeader(event, 'Cache-Control', 'private, no-store')")
    expect(source).toContain('session.user.id')
    expect(source).not.toContain('getQuery')
  })
})

import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import {
  createDocumentWith,
  nextAvailableSlug,
  slugBaseFromTitle,
  validateCreateDocument,
} from '../../../server/modules/documents/create-document'
import { documentTemplateContent } from '../../../server/modules/documents/templates'

const validInput = {
  actorUserId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  channel: 'web',
  title: 'Архитектура проекта',
  parentId: null,
  template: DOCUMENT_TEMPLATE.BLANK,
} as const

describe('create document', () => {
  it('normalizes a valid command and rejects an empty or oversized title', () => {
    expect(validateCreateDocument({ ...validInput, title: '  Архитектура  ' })).toEqual({
      ok: true,
      value: {
        actorUserId: validInput.actorUserId,
        projectId: validInput.projectId,
        channel: validInput.channel,
        title: 'Архитектура',
        parentId: null,
        initialSource: { kind: 'template', template: DOCUMENT_TEMPLATE.BLANK },
        searchText: '',
        internalLinkTargetIds: [],
        referencedImageIds: [],
      },
    })
    expect(validateCreateDocument({ ...validInput, title: '   ' })).toEqual({ ok: false, code: 'INVALID_TITLE' })
    expect(validateCreateDocument({ ...validInput, title: 'A'.repeat(201) })).toEqual({ ok: false, code: 'INVALID_TITLE' })
  })

  it('normalizes validated content as an explicit initial source', () => {
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Initial text' }] }],
    }
    expect(validateCreateDocument({
      actorUserId: validInput.actorUserId,
      projectId: validInput.projectId,
      channel: validInput.channel,
      title: validInput.title,
      parentId: null,
      content,
    })).toEqual({
      ok: true,
      value: {
        actorUserId: validInput.actorUserId,
        projectId: validInput.projectId,
        channel: validInput.channel,
        title: validInput.title,
        parentId: null,
        initialSource: { kind: 'content', content },
        searchText: 'Initial text',
        internalLinkTargetIds: [],
        referencedImageIds: [],
      },
    })
  })

  it('creates stable transliterated slugs and resolves project-local collisions', () => {
    expect(slugBaseFromTitle('Техническое задание API')).toBe('tehnicheskoe-zadanie-api')
    expect(nextAvailableSlug('architecture', ['architecture', 'architecture-2', 'architecture-4'])).toBe('architecture-3')
    expect(nextAvailableSlug('operations', [])).toBe('operations')
  })

  it('builds validated Tiptap documents from every system template', () => {
    for (const template of Object.values(DOCUMENT_TEMPLATE)) {
      const content = documentTemplateContent(template)
      expect(content.type).toBe('doc')
      expect(content.content).toBeInstanceOf(Array)
    }
    expect(documentTemplateContent(DOCUMENT_TEMPLATE.TECHNICAL_SPECIFICATION)).toMatchObject({
      content: expect.arrayContaining([expect.objectContaining({ type: 'heading' })]),
    })
  })

  it('persists only a validated command and preserves domain failures', async () => {
    const persist = vi.fn().mockResolvedValue({ ok: true, documentId: 'document-1' })
    const create = createDocumentWith({ persist })

    await expect(create(validInput)).resolves.toEqual({ ok: true, value: { documentId: 'document-1' } })
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({
      title: validInput.title,
      initialSource: { kind: 'template', template: DOCUMENT_TEMPLATE.BLANK },
    }))

    await expect(create({ ...validInput, title: '' })).resolves.toEqual({ ok: false, code: 'INVALID_TITLE' })
    expect(persist).toHaveBeenCalledOnce()
  })

  it('keeps the HTTP boundary thin and checks documents.create in the shared service', async () => {
    const [handlerSource, serviceSource] = await Promise.all([
      readFile('server/api/projects/[id]/documents/index.post.ts', 'utf8'),
      readFile('server/modules/documents/create-document.ts', 'utf8'),
    ])

    expect(handlerSource).toContain('createDocumentBodySchema.safeParse')
    expect(handlerSource).toContain('requireSession')
    expect(handlerSource).toContain('? 404')
    expect(handlerSource).toContain('setResponseStatus(event, status)')
    expect(serviceSource).toContain('PROJECT_PERMISSION.DOCUMENTS_CREATE')
    expect(serviceSource).not.toMatch(/role(?:Name|Kind)|PROJECT_ROLE/u)
  })
})

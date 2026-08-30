import { describe, expect, it } from 'vitest'
import {
  collectDocumentAttachments,
  DOCUMENT_DETAILS_TAB,
} from '../../../../app/features/documents/model/document-attachments'

const PROJECT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const IMAGE_ID = '11111111-1111-4111-8111-111111111111'
const TARGET_ID = '22222222-2222-4222-8222-222222222222'

describe('document attachments', () => {
  it('extracts unique images and safe links from document content in content order', () => {
    const attachments = collectDocumentAttachments({
      projectId: PROJECT_ID,
      internalLinks: [{ id: TARGET_ID, title: 'Авторизация' }],
      content: {
        type: 'doc',
        content: [
          { type: 'image', attrs: { imageId: IMAGE_ID, alt: 'Схема сервиса' } },
          { type: 'image', attrs: { imageId: IMAGE_ID, alt: 'Дубликат' } },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Документация', marks: [{ type: 'link', attrs: { href: 'https://example.com/docs' } }] },
              { type: 'text', text: 'Вход', marks: [{ type: 'link', attrs: { href: `document:${TARGET_ID}` } }] },
              { type: 'text', text: 'Опасная', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
            ],
          },
          {
            type: 'externalEmbed',
            attrs: {
              schemaVersion: 1,
              provider: 'figma',
              resourceType: 'design',
              resourceKey: 'AbCdEf123',
              title: 'Макет',
              width: 960,
              height: 540,
            },
          },
        ],
      },
    })

    expect(attachments.images).toEqual([{
      id: IMAGE_ID,
      alt: 'Схема сервиса',
      url: `/api/projects/${PROJECT_ID}/documents/images/${IMAGE_ID}`,
      downloadUrl: `/api/projects/${PROJECT_ID}/documents/images/${IMAGE_ID}?download=1`,
    }])
    expect(attachments.files).toEqual([])
    expect(attachments.links).toEqual([
      { kind: 'external', href: 'https://example.com/docs', label: 'Документация' },
      { kind: 'internal', href: `/projects/${PROJECT_ID}/documents/${TARGET_ID}`, label: 'Авторизация' },
      { kind: 'embed', href: 'https://www.figma.com/design/AbCdEf123', label: 'Макет' },
    ])
  })

  it('defines the closed set of right-panel tabs', () => {
    expect(Object.values(DOCUMENT_DETAILS_TAB)).toEqual(['images', 'files', 'links', 'history'])
  })
})

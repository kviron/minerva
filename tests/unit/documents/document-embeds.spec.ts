import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { documentContentSchema, parseDocumentContent } from '../../../server/modules/documents/content-schema'
import { extractDocumentSearchText } from '../../../server/modules/documents/search-documents'
import { parseProjectDescription } from '../../../server/modules/projects/project-description'

const embedNode = {
  type: 'externalEmbed',
  attrs: {
    schemaVersion: 1,
    provider: 'figma',
    resourceType: 'design',
    resourceKey: 'BAZsTPbh6W1r66Bdo',
    nodeId: '12-34',
    title: 'Главный экран',
    height: 520,
  },
} as const

describe('document external embeds', () => {
  it('accepts only an exact structured descriptor without executable content', () => {
    const parsed = parseDocumentContent({ type: 'doc', content: [embedNode] })
    expect(parsed).toEqual({ type: 'doc', content: [embedNode] })
    expect(parseDocumentContent({
      type: 'doc',
      content: [{ ...embedNode, content: [{ type: 'text', text: '<script>alert(1)</script>' }] }],
    })).toBeNull()
    expect(parseDocumentContent({
      type: 'doc',
      content: [{ ...embedNode, attrs: { ...embedNode.attrs, url: 'https://evil.example' } }],
    })).toBeNull()
    expect(documentContentSchema.safeParse({
      type: 'doc',
      content: [{ ...embedNode, attrs: { ...embedNode.attrs, url: 'https://evil.example' } }],
    }).success).toBe(false)
  })

  it('indexes only the accessible title and remains unavailable in project descriptions', () => {
    const content = { type: 'doc', content: [embedNode] } as const
    expect(extractDocumentSearchText(content)).toBe('Главный экран')
    expect(parseProjectDescription(content)).toEqual({ ok: false, code: 'INVALID_DESCRIPTION' })
  })

  it('uses a dedicated editor node and a safe renderer without raw HTML', async () => {
    const [editor, toolbar, reader, embedExtension, renderer, config] = await Promise.all([
      readFile('app/features/documents/ui/DocumentEditor.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentEditorToolbar.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentContentNode.vue', 'utf8'),
      readFile('app/features/documents/model/document-embed.ts', 'utf8'),
      readFile('app/features/documents/ui/embeds/DocumentExternalEmbed.vue', 'utf8'),
      readFile('server/modules/operations/http-security.ts', 'utf8'),
    ])
    expect(editor).toContain('createDocumentEmbedExtension({')
    expect(editor).toContain('colorMode.value === \'dark\'')
    expect(toolbar).toContain('parseFigmaEmbedInput')
    expect(toolbar).toContain("type: 'externalEmbed'")
    expect(toolbar).toContain("updateAttributes('externalEmbed'")
    expect(toolbar).toContain('deleteSelection().run()')
    expect(toolbar).toContain('FIGMA_EMBED_MIN_HEIGHT')
    expect(reader).toContain('<DocumentExternalEmbed')
    expect(embedExtension).toContain('createResizeHandle')
    expect(renderer).toContain('sandbox=')
    expect(renderer).toContain('loading="lazy"')
    expect(renderer).toContain('useColorMode()')
    expect(renderer).toContain('buildFigmaEmbedUrl(descriptor.value, embedTheme.value)')
    expect(renderer).not.toContain('v-html')
    expect(config).toContain("frame-src 'self' https://embed.figma.com https://www.figma.com")
  })
})

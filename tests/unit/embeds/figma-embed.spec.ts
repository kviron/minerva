import { describe, expect, it } from 'vitest'
import {
  buildFigmaEmbedUrl,
  buildFigmaExternalUrl,
  figmaEmbedDescriptorSchema,
  parseFigmaEmbedInput,
} from '../../../shared/embeds/figma'

describe('Figma embed contract', () => {
  it('normalizes design, prototype and board links to structured descriptors', () => {
    expect(parseFigmaEmbedInput({
      url: 'https://www.figma.com/design/BAZsTPbh6W1r66Bdo/Minerva?node-id=12-34&t=tracking',
      title: ' Главный экран ',
      height: 560,
    })).toEqual({
      ok: true,
      value: {
        schemaVersion: 1,
        provider: 'figma',
        resourceType: 'design',
        resourceKey: 'BAZsTPbh6W1r66Bdo',
        nodeId: '12-34',
        title: 'Главный экран',
        width: 960,
        height: 560,
      },
    })

    expect(parseFigmaEmbedInput({
      url: 'https://embed.figma.com/proto/AZBcScMePxSpiX9j/Flow?embed-host=other',
      title: '',
    })).toMatchObject({ ok: true, value: { resourceType: 'proto', title: 'Материал Figma', width: 960, height: 520 } })
    expect(parseFigmaEmbedInput({ url: 'https://figma.com/board/BAZsTPbh6W1r66Bdo/Map', title: 'Карта' }))
      .toMatchObject({ ok: true, value: { resourceType: 'board' } })
  })

  it.each([
    'http://www.figma.com/design/BAZsTPbh6W1r66Bdo/Test',
    'https://figma.example/design/BAZsTPbh6W1r66Bdo/Test',
    'https://figma.com.evil.example/design/BAZsTPbh6W1r66Bdo/Test',
    'https://user:password@www.figma.com/design/BAZsTPbh6W1r66Bdo/Test',
    'https://www.figma.com:444/design/BAZsTPbh6W1r66Bdo/Test',
    'https://www.figma.com/make/BAZsTPbh6W1r66Bdo/Test',
    'javascript:alert(1)',
  ])('rejects an unsafe or unsupported URL: %s', (url) => {
    expect(parseFigmaEmbedInput({ url, title: 'Test' })).toEqual({ ok: false, code: 'invalid_figma_url' })
  })

  it('builds URLs from validated fields and ignores arbitrary source query parameters', () => {
    const parsed = parseFigmaEmbedInput({
      url: 'https://www.figma.com/design/BAZsTPbh6W1r66Bdo/Test?node-id=12-34&evil=javascript:alert(1)',
      title: 'Test',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(buildFigmaEmbedUrl(parsed.value, 'dark')).toBe(
      'https://embed.figma.com/design/BAZsTPbh6W1r66Bdo?embed-host=minerva&node-id=12-34&theme=dark',
    )
    expect(buildFigmaEmbedUrl(parsed.value, 'light')).toContain('theme=light')
    expect(buildFigmaExternalUrl(parsed.value)).toBe('https://www.figma.com/design/BAZsTPbh6W1r66Bdo?node-id=12-34')
  })

  it('keeps the persisted descriptor strict and bounded', () => {
    const valid = {
      schemaVersion: 1,
      provider: 'figma',
      resourceType: 'design',
      resourceKey: 'BAZsTPbh6W1r66Bdo',
      title: 'Design',
      height: 520,
    }
    expect(figmaEmbedDescriptorSchema.safeParse(valid).success).toBe(true)
    expect(figmaEmbedDescriptorSchema.safeParse({ ...valid, height: 120 }).success).toBe(false)
    expect(figmaEmbedDescriptorSchema.safeParse({ ...valid, width: 319 }).success).toBe(false)
    expect(figmaEmbedDescriptorSchema.safeParse({ ...valid, script: 'alert(1)' }).success).toBe(false)
  })
})

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { beforeAll, describe, expect, it } from 'vitest'

const componentPath = fileURLToPath(
  new URL('../../../../app/components/app/page-placeholder/index.vue', import.meta.url),
)

describe('AppPagePlaceholder', () => {
  let source: string

  beforeAll(async () => {
    source = await readFile(componentPath, 'utf8')
  })

  it('provides accessible default copy and supports page-specific copy', () => {
    expect(source).toMatch(/title\?: string/)
    expect(source).toMatch(/description\?: string/)
    expect(source.match(/<h1\b/g)).toHaveLength(1)
    expect(source.match(/<p\b/g)).toHaveLength(1)
    expect(source).toContain('{{ title }}')
    expect(source).toContain('{{ description }}')
    expect(source).toContain('Страница в разработке')
    expect(source).toContain('Этот раздел пока недоступен. Мы работаем над ним.')
  })

  it('uses a decorative Construction icon in a centered readable layout', () => {
    expect(source).toContain("import { Construction } from '@lucide/vue'")
    expect(source).toMatch(/<Construction\b/)
    expect(source).toContain('aria-hidden="true"')
    expect(source).toMatch(/<Construction\b[^>]*class="[^"]*\btext-muted-foreground\b[^"]*"/s)
    expect(source).toMatch(/<section[^>]*class="[^"]*items-center[^"]*justify-center[^"]*text-center/)
    expect(source).toMatch(/class="[^"]*max-w-md[^"]*"/)
    expect(source).toMatch(/class="[^"]*px-4[^"]*"/)
  })

  it('contains no navigation, authorization, session, or request logic', () => {
    expect(source).not.toMatch(
      /\b(?:useRoute|useRouter|navigateTo|useFetch|useLazyFetch|useAsyncData|useRequestFetch|useAuth|useSession|permission|authorization|axios|ofetch)\b|\$fetch|\$api|\bfetch\s*\(/iu,
    )
  })
})

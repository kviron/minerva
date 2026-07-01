import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = fileURLToPath(
  new URL('../../../../app/components/app/page-placeholder/index.vue', import.meta.url),
)

describe('AppPagePlaceholder', () => {
  it('provides an accessible presentation-only development state', async () => {
    const source = await readFile(componentPath, 'utf8')

    expect(source.match(/<h1\b/g)).toHaveLength(1)
    expect(source).toContain('Страница в разработке')
    expect(source).toContain('Этот раздел пока недоступен. Мы работаем над ним.')
    expect(source).toContain('aria-hidden="true"')
    expect(source).not.toMatch(/useRoute|useFetch|\$fetch|useAuth|useSession/)
  })
})

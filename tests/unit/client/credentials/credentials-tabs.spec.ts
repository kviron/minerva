import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseArchivedCredentialList } from '../../../../app/features/credentials/api/credentials-api'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('credentials tabs', () => {
  it('defines the data, categories, and archive tabs as a closed set', async () => {
    const tabs = await read('../../../../app/features/credentials/model/credentials-tabs.ts')

    expect(tabs).toContain("DATA: 'data'")
    expect(tabs).toContain("CATEGORIES: 'categories'")
    expect(tabs).toContain("ARCHIVE: 'archive'")
    expect(tabs).toContain("label: 'Данные'")
    expect(tabs).toContain("label: 'Категории'")
    expect(tabs).toContain("label: 'Архив'")
  })

  it('renders category and read-only archive lists inside Tabs', async () => {
    const [view, categories, archive, select] = await Promise.all([
      read('../../../../app/features/credentials/ui/CredentialsView.vue'),
      read('../../../../app/features/credentials/ui/CredentialCategoriesTable.vue'),
      read('../../../../app/features/credentials/ui/CredentialsArchiveTable.vue'),
      read('../../../../app/components/ui/select/index.ts'),
    ])

    expect(view).toContain('<UiTabs v-model="activeTab"')
    expect(view).toContain('<UiTabsTrigger')
    expect(view).toContain('<CredentialCategoriesTable')
    expect(view).toContain('<CredentialsArchiveTable')
    expect(view).toContain('loadArchivedCredentials')
    expect(view).toContain('watchDebounced(search, loadCredentials')
    expect(view).toContain('actions.load(query)')
    expect(view).toContain('class="relative w-full sm:w-96 sm:flex-none"')
    expect(view).toContain('<UiSelect v-model="selectedCategoryId">')
    expect(view).toContain('aria-label="Фильтр по категории"')
    expect(view).toContain('<UiSelectItem value="all">Все категории</UiSelectItem>')
    expect(select).toContain('default as Select }')
    expect(select).toContain('default as SelectContent }')
    expect(categories).toContain('category in categories')
    expect(categories).toContain("emit('edit', category.id)")
    expect(archive).toContain('row.archivedAt')
    expect(archive).toContain('row.archivedBy.name')
    expect(archive).not.toContain('reveal')
    expect(archive).not.toContain('restore')
  })

  it('validates the safe archive projection without accepting secret values', () => {
    expect(parseArchivedCredentialList([{
      id: 'credential-1',
      title: 'Production',
      category: { id: 'category-1', name: 'Servers' },
      hasLogin: true,
      hasPassword: true,
      dynamicFieldCount: 2,
      archivedAt: '2026-07-13T10:00:00.000Z',
      archivedBy: { name: 'Admin' },
    }])).toEqual([expect.objectContaining({ id: 'credential-1', dynamicFieldCount: 2 })])

    expect(() => parseArchivedCredentialList([{
      id: 'credential-1',
      title: 'Production',
      category: { id: 'category-1', name: 'Servers' },
      login: 'root@example.com',
      hasLogin: true,
      hasPassword: true,
      dynamicFieldCount: 2,
      archivedAt: '2026-07-13T10:00:00.000Z',
      archivedBy: { name: 'Admin' },
    }])).toThrow('Invalid archived credential list')
  })
})

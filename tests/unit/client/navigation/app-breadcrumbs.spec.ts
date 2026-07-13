import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { buildAppBreadcrumbs } from '../../../../app/features/navigation/model/app-breadcrumbs'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('application breadcrumbs', () => {
  it('builds project credentials hierarchy with the loaded project name', () => {
    expect(buildAppBreadcrumbs('/projects/project-1/credentials', 'Minerva')).toEqual([
      { label: 'Проекты', to: '/projects' },
      { label: 'Minerva', to: '/projects/project-1' },
      { label: 'Учётные данные' },
    ])
  })

  it('builds nested document and administration hierarchies', () => {
    expect(buildAppBreadcrumbs('/projects/project-1/documents/document-1/history', 'Minerva', 'Архитектура')).toEqual([
      { label: 'Проекты', to: '/projects' },
      { label: 'Minerva', to: '/projects/project-1' },
      { label: 'Документация', to: '/projects/project-1/documents' },
      { label: 'Архитектура', to: '/projects/project-1/documents/document-1' },
      { label: 'История' },
    ])
    expect(buildAppBreadcrumbs('/administration/users/user-1', null)).toEqual([
      { label: 'Администрирование', to: '/administration' },
      { label: 'Пользователи', to: '/administration/users' },
      { label: 'Пользователь' },
    ])
  })

  it('maps global pages and keeps only the current item non-clickable', () => {
    expect(buildAppBreadcrumbs('/settings/security', null)).toEqual([
      { label: 'Настройки', to: '/settings' },
      { label: 'Безопасность' },
    ])
    expect(buildAppBreadcrumbs('/projects', null)).toEqual([{ label: 'Проекты' }])
  })

  it('renders the dynamic component in the application header without demo placeholders', async () => {
    const [header, breadcrumbs] = await Promise.all([
      read('../../../../app/components/app/header/index.vue'),
      read('../../../../app/features/navigation/ui/AppBreadcrumbs.vue'),
    ])

    expect(header).toContain('<AppBreadcrumbs />')
    expect(header).not.toContain('Building Your Application')
    expect(header).not.toContain('Data Fetching')
    expect(breadcrumbs).toContain('buildAppBreadcrumbs(route.path, projectName.value, documentName.value)')
    expect(breadcrumbs).toContain('as-child')
    expect(breadcrumbs).toContain('<NuxtLink :to="item.to">')
    expect(breadcrumbs).toContain('<UiBreadcrumbPage v-else>')
  })
})

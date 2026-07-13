import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  filterProjectsByStatus,
  PROJECT_STATUS_FILTER,
  PROJECT_STATUS_FILTERS,
} from '../../../../app/features/projects/model/project-status-filter'

const projects = [
  { id: 'active-project', status: 'active' as const },
  { id: 'archived-project', status: 'archived' as const },
] as const

describe('project status filter', () => {
  it('keeps every project for the all filter', () => {
    expect(filterProjectsByStatus(projects, PROJECT_STATUS_FILTER.ALL)).toEqual(projects)
  })

  it('filters projects by their status without mutating the source', () => {
    expect(filterProjectsByStatus(projects, PROJECT_STATUS_FILTER.ACTIVE)).toEqual([projects[0]])
    expect(filterProjectsByStatus(projects, PROJECT_STATUS_FILTER.ARCHIVED)).toEqual([projects[1]])
    expect(projects).toHaveLength(2)
  })

  it('provides the shared Russian filter labels', () => {
    expect(PROJECT_STATUS_FILTERS).toEqual([
      { value: 'all', label: 'Все' },
      { value: 'active', label: 'Активные' },
      { value: 'archived', label: 'Архивные' },
    ])
  })

  it('uses one reusable tabs component in both project scopes', async () => {
    const view = await readFile(
      new URL('../../../../app/features/projects/ui/ProjectsView.vue', import.meta.url),
      'utf8',
    )
    const tabs = await readFile(
      new URL('../../../../app/features/projects/ui/ProjectStatusTabs.vue', import.meta.url),
      'utf8',
    )

    expect(view).toMatch(/<ProjectStatusTabs\s+v-model="statusFilter"/)
    expect(tabs).toContain('<UiTabsList>')
    expect(tabs).toContain('v-for="filter in PROJECT_STATUS_FILTERS"')
  })
})

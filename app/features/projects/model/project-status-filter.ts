import type { ProjectStatus } from '../../../../shared/projects/types'
import { PROJECT_STATUS } from '../../../../shared/projects/constants'

export const PROJECT_STATUS_FILTER = {
  ALL: 'all',
  ACTIVE: PROJECT_STATUS.ACTIVE,
  ARCHIVED: PROJECT_STATUS.ARCHIVED,
} as const

export type ProjectStatusFilter = typeof PROJECT_STATUS_FILTER[keyof typeof PROJECT_STATUS_FILTER]

export const PROJECT_STATUS_FILTERS = [
  { value: PROJECT_STATUS_FILTER.ALL, label: 'Все' },
  { value: PROJECT_STATUS_FILTER.ACTIVE, label: 'Активные' },
  { value: PROJECT_STATUS_FILTER.ARCHIVED, label: 'Архивные' },
] as const satisfies readonly { value: ProjectStatusFilter, label: string }[]

export const isProjectStatusFilter = (value: unknown): value is ProjectStatusFilter =>
  PROJECT_STATUS_FILTERS.some(filter => filter.value === value)

export const filterProjectsByStatus = <T extends readonly { readonly status: ProjectStatus }[]>(
  projects: T,
  filter: ProjectStatusFilter,
): readonly T[number][] => filter === PROJECT_STATUS_FILTER.ALL
  ? projects
  : projects.filter(project => project.status === filter)

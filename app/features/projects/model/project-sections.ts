import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'
import type { ProjectPermission } from '../../../../shared/projects/types'

export const PROJECT_SECTION = {
  OVERVIEW: 'overview',
  DOCUMENTS: 'documents',
  SETTINGS: 'settings',
} as const

export type ProjectSection = typeof PROJECT_SECTION[keyof typeof PROJECT_SECTION]

const PROJECT_SECTIONS = [
  { value: PROJECT_SECTION.OVERVIEW, label: 'Обзор' },
  { value: PROJECT_SECTION.DOCUMENTS, label: 'Страницы' },
  { value: PROJECT_SECTION.SETTINGS, label: 'Настройки' },
] as const satisfies readonly { value: ProjectSection, label: string }[]

export const projectSectionPath = (projectId: string, section: ProjectSection): string => {
  const base = `/projects/${projectId}`
  return section === PROJECT_SECTION.OVERVIEW ? base : `${base}/${section}`
}

export const availableProjectSections = (permissions: readonly ProjectPermission[]) =>
  PROJECT_SECTIONS.filter(section => section.value !== PROJECT_SECTION.SETTINGS
    || permissions.includes(PROJECT_PERMISSION.PROJECT_UPDATE))

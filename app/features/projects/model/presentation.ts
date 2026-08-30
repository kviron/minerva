import type {
  AdministrationProjectsResponse,
  MemberProjectsResponse,
  ProjectRoleProjection,
} from '../../../../shared/projects/contracts'
import type { ProjectStatus } from '../../../../shared/projects/types'

const roleLabels = { admin: 'Администратор', editor: 'Редактор', viewer: 'Наблюдатель' } as const
const statusLabels = {
  active: 'Активен',
  paused: 'Приостановлен',
  closed: 'Закрыт',
  archived: 'Архив',
} as const

export const projectRoleLabel = (role: ProjectRoleProjection) =>
  role.builtInKey === null ? role.customName ?? '' : roleLabels[role.builtInKey]
export const projectStatusLabel = (status: ProjectStatus) => statusLabels[status]
export const projectUpdatedAtLabel = (value: string) => new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric',
}).format(new Date(value))

export interface ProjectTableRow {
  readonly id: string
  readonly iconId: string | null
  readonly name: string
  readonly description: string | null
  readonly status: ProjectStatus
  readonly updatedAt: string
  readonly access: string | number
}

export const memberProjectTableRows = (projects: MemberProjectsResponse['items']): readonly ProjectTableRow[] =>
  projects.map(project => ({
    id: project.id,
    iconId: project.iconId,
    name: project.name,
    description: project.description,
    status: project.status,
    updatedAt: project.updatedAt,
    access: projectRoleLabel(project.role),
  }))

export const administrationProjectTableRows = (
  projects: AdministrationProjectsResponse['items'],
): readonly ProjectTableRow[] => projects.map(project => ({
  id: project.id,
  iconId: project.iconId,
  name: project.name,
  description: project.description,
  status: project.status,
  updatedAt: project.updatedAt,
  access: project.activeMemberCount,
}))

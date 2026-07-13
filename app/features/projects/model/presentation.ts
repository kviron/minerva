import type { ProjectRoleProjection } from '../../../../shared/projects/contracts'
import type { ProjectStatus } from '../../../../shared/projects/types'

const roleLabels = { admin: 'Администратор', editor: 'Редактор', viewer: 'Наблюдатель' } as const
const statusLabels = { active: 'Активен', archived: 'Архив' } as const

export const projectRoleLabel = (role: ProjectRoleProjection) =>
  role.builtInKey === null ? role.customName ?? '' : roleLabels[role.builtInKey]
export const projectStatusLabel = (status: ProjectStatus) => statusLabels[status]
export const projectUpdatedAtLabel = (value: string) => new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric',
}).format(new Date(value))

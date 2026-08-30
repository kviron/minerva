import type {
  AdministrationProjectListItem,
  MemberProjectListItem,
  ProjectOverviewProjection,
} from '../../../shared/projects/contracts'
import type { DocumentContent } from '../../../shared/documents/contracts'
import type {
  ProjectPermission,
  ProjectRoleKey,
  ProjectRoleKind,
  ProjectStatus,
} from '../../../shared/projects/types'
import { projectRoleProjection } from './project-role-projection'

interface ProjectValues {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly status: ProjectStatus
  readonly updatedAt: Date
  readonly iconId: string | null
}

interface RoleValues {
  readonly roleKind: ProjectRoleKind
  readonly builtInKey: ProjectRoleKey | null
  readonly roleName: string
}

export const toMemberProjectListItem = (
  values: ProjectValues & RoleValues,
): MemberProjectListItem => ({
  id: values.id,
  name: values.name,
  description: values.description,
  status: values.status,
  iconId: values.iconId,
  updatedAt: values.updatedAt.toISOString(),
  role: projectRoleProjection(values.roleKind, values.builtInKey, values.roleName),
})

export const toAdministrationProjectListItem = (
  values: ProjectValues & { readonly activeMemberCount: number },
): AdministrationProjectListItem => ({
  id: values.id,
  name: values.name,
  description: values.description,
  status: values.status,
  iconId: values.iconId,
  updatedAt: values.updatedAt.toISOString(),
  activeMemberCount: values.activeMemberCount,
})

export const toProjectOverview = (
  values: ProjectValues & RoleValues & {
    readonly descriptionContent: DocumentContent
    readonly createdAt: Date
    readonly activeMemberCount: number
    readonly permissions: readonly ProjectPermission[]
  },
): ProjectOverviewProjection => ({
  id: values.id,
  name: values.name,
  description: values.description,
  descriptionContent: values.descriptionContent,
  status: values.status,
  iconId: values.iconId,
  createdAt: values.createdAt.toISOString(),
  updatedAt: values.updatedAt.toISOString(),
  activeMemberCount: values.activeMemberCount,
  role: projectRoleProjection(values.roleKind, values.builtInKey, values.roleName),
  permissions: [...values.permissions],
})

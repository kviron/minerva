import type {
  AdministrationProjectsResponse,
  CreateProjectResponse,
  MemberProjectsResponse,
} from '../../../../../shared/projects/contracts'

export const PROJECTS_SCOPE = {
  MEMBER: 'member',
  ADMINISTRATION: 'administration',
} as const

export type ProjectsScope = typeof PROJECTS_SCOPE[keyof typeof PROJECTS_SCOPE]

export type ProjectsListResult =
  | { readonly scope: typeof PROJECTS_SCOPE.MEMBER, readonly projects: MemberProjectsResponse['items'], readonly nextCursor: string | null }
  | { readonly scope: typeof PROJECTS_SCOPE.ADMINISTRATION, readonly projects: AdministrationProjectsResponse['items'], readonly nextCursor: string | null }

export interface CreateProjectActionResult {
  readonly created: CreateProjectResponse
  readonly list: ProjectsListResult
}

import type { ProjectPermission, ProjectRoleKey, ProjectStatus } from './types'

export interface ProjectRoleProjection {
  readonly builtInKey: ProjectRoleKey | null
  readonly customName: string | null
}

export interface MemberProjectListItem {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly status: ProjectStatus
  readonly updatedAt: string
  readonly role: ProjectRoleProjection
}

export type MemberProjectsResponse = readonly MemberProjectListItem[]

export interface AdministrationProjectListItem {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly status: ProjectStatus
  readonly updatedAt: string
  readonly activeMemberCount: number
}

export interface ProjectOverviewProjection {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly status: ProjectStatus
  readonly createdAt: string
  readonly updatedAt: string
  readonly activeMemberCount: number
  readonly role: ProjectRoleProjection
  readonly permissions: readonly ProjectPermission[]
}

export type AdministrationProjectsResponse = readonly AdministrationProjectListItem[]
export type ProjectListItem = MemberProjectListItem | AdministrationProjectListItem
export type ProjectsResponse = MemberProjectsResponse | AdministrationProjectsResponse

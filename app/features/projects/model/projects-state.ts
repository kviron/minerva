import { defineStore } from 'pinia'
import type { AdministrationProjectsResponse, MemberProjectsResponse } from '../../../../shared/projects/contracts'

type ProjectsListState =
  | { readonly scope: 'member', readonly projects: MemberProjectsResponse['items'], readonly nextCursor: string | null }
  | { readonly scope: 'administration', readonly projects: AdministrationProjectsResponse['items'], readonly nextCursor: string | null }

interface ProjectsState { list: ProjectsListState }

export const useProjectsStore = defineStore('projects', {
  state: (): ProjectsState => ({
    list: { scope: 'member', projects: [], nextCursor: null },
  }),

  actions: {
    applyMemberProjects(projects: MemberProjectsResponse['items'], nextCursor: string | null = null): void {
      this.list = { scope: 'member', projects: [...projects], nextCursor }
    },
    applyAdministrationProjects(projects: AdministrationProjectsResponse['items'], nextCursor: string | null = null): void {
      this.list = { scope: 'administration', projects: [...projects], nextCursor }
    },
    appendMemberProjects(projects: MemberProjectsResponse['items'], nextCursor: string | null): void {
      if (this.list.scope !== 'member') return
      this.list = { scope: 'member', projects: [...this.list.projects, ...projects], nextCursor }
    },
    appendAdministrationProjects(projects: AdministrationProjectsResponse['items'], nextCursor: string | null): void {
      if (this.list.scope !== 'administration') return
      this.list = { scope: 'administration', projects: [...this.list.projects, ...projects], nextCursor }
    },
  },
})

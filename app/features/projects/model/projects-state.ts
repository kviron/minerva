import { defineStore } from 'pinia'
import type { ProjectListItem } from '../../../../shared/projects/contracts'

interface ProjectsState {
  projects: ProjectListItem[]
}

export const useProjectsStore = defineStore('projects', {
  state: (): ProjectsState => ({
    projects: [],
  }),

  actions: {
    applyProjects(projects: readonly ProjectListItem[]): void {
      this.projects = [...projects]
    },
  },
})

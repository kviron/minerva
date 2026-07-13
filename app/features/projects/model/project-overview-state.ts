import { defineStore } from 'pinia'
import type { ProjectOverviewProjection } from '../../../../shared/projects/contracts'

interface ProjectOverviewState {
  project: ProjectOverviewProjection | null
}

export const useProjectOverviewStore = defineStore('project-overview', {
  state: (): ProjectOverviewState => ({
    project: null,
  }),

  actions: {
    applyProject(project: ProjectOverviewProjection): void {
      this.project = project
    },

    clearProject(): void {
      this.project = null
    },
  },
})

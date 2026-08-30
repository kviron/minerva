import { defineStore } from 'pinia'
import type { ProjectAiConnection } from '../../../../shared/ai-assistant/contracts'

interface ProjectAiConnectionState {
  projectId: string | null
  connection: ProjectAiConnection | null
}

export const useProjectAiConnectionStore = defineStore('project-ai-connection', {
  state: (): ProjectAiConnectionState => ({ projectId: null, connection: null }),
  actions: {
    apply(projectId: string, connection: ProjectAiConnection | null): void {
      this.projectId = projectId
      this.connection = connection
    },
    clear(): void {
      this.projectId = null
      this.connection = null
    },
  },
})

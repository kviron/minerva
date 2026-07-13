import { readonly, ref } from 'vue'
import type { ProjectOverviewProjection } from '../../../../shared/projects/contracts'
import { projectsApi } from '../api/projects-api'

export function useProjectOverview(projectId: () => string) {
  const project = ref<ProjectOverviewProjection | null>(null)
  const pending = ref(true)
  const error = ref('')

  const load = async () => {
    pending.value = true
    error.value = ''
    project.value = null
    try {
      project.value = await projectsApi.get(projectId())
    }
    catch {
      error.value = 'Проект недоступен или не найден.'
    }
    finally {
      pending.value = false
    }
  }

  return { project: readonly(project), pending: readonly(pending), error: readonly(error), load }
}

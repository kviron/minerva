import { readonly, ref } from 'vue'
import type { ProjectsResponse } from '../../../../shared/projects/contracts'
import { projectsApi, type CreateProjectInput } from '../api/projects-api'

export const PROJECTS_SCOPE = {
  MEMBER: 'member',
  ADMINISTRATION: 'administration',
} as const

export type ProjectsScope = typeof PROJECTS_SCOPE[keyof typeof PROJECTS_SCOPE]

export function useProjects(scope: ProjectsScope = PROJECTS_SCOPE.MEMBER) {
  const projects = ref<ProjectsResponse>([])
  const pending = ref(true)
  const error = ref('')

  const load = async () => {
    pending.value = true
    error.value = ''
    try {
      projects.value = scope === PROJECTS_SCOPE.ADMINISTRATION
        ? await projectsApi.listAdministration()
        : await projectsApi.list()
    }
    catch { error.value = 'Не удалось загрузить проекты.' }
    finally { pending.value = false }
  }

  const create = async (input: CreateProjectInput) => {
    await projectsApi.create(input)
    await load()
  }

  return { projects: readonly(projects), pending: readonly(pending), error: readonly(error), load, create }
}

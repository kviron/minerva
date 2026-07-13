import { inject, provide, type InjectionKey } from 'vue'
import type { ProjectsActions } from './actions'

const ProjectsActionsKey: InjectionKey<ProjectsActions> = Symbol('ProjectsActions')

export const provideProjectsActions = (actions: ProjectsActions): void => {
  provide(ProjectsActionsKey, actions)
}

export const useProjectsActions = (): ProjectsActions => {
  const actions = inject(ProjectsActionsKey)
  if (!actions) {
    throw new Error('useProjectsActions must be used inside the Projects feature provider')
  }
  return actions
}

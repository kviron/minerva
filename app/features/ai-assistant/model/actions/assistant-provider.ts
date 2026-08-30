import { inject, provide, type InjectionKey } from 'vue'
import type { ProjectAssistantActions } from './assistant-actions'

const ProjectAssistantActionsKey: InjectionKey<ProjectAssistantActions> = Symbol('ProjectAssistantActions')

export const provideProjectAssistantActions = (actions: ProjectAssistantActions): void => {
  provide(ProjectAssistantActionsKey, actions)
}

export const useProjectAssistantActions = (): ProjectAssistantActions => {
  const actions = inject(ProjectAssistantActionsKey)
  if (!actions) throw new Error('useProjectAssistantActions must be used inside ProjectAssistantProvider')
  return actions
}

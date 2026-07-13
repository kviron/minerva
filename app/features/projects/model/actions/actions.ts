import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import type { ProjectsResponse } from '../../../../../shared/projects/contracts'
import { projectsApi, type CreateProjectInput } from '../../api/projects-api'
import { PROJECTS_SCOPE, type ProjectsScope } from './types'

export const PROJECT_ACTION = {
  LOAD: 'projects.load',
  CREATE: 'project.create',
  LOAD_OVERVIEW: 'project.overview.load',
} as const

export class ProjectsActions extends BaseActions {
  constructor(options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'projects' })
  }

  public load = this.createAsyncAction({
    name: PROJECT_ACTION.LOAD,
    run: async (signal: AbortSignal, scope: ProjectsScope): Promise<ProjectsResponse> => scope === PROJECTS_SCOPE.ADMINISTRATION
      ? await projectsApi.listAdministration(signal)
      : await projectsApi.list(signal),
    idGetter: scope => scope,
  })

  public create = this.createAsyncAction({
    name: PROJECT_ACTION.CREATE,
    run: async (signal: AbortSignal, input: CreateProjectInput, scope: ProjectsScope): Promise<ProjectsResponse> => {
      await projectsApi.create(input, signal)
      return scope === PROJECTS_SCOPE.ADMINISTRATION
        ? await projectsApi.listAdministration(signal)
        : await projectsApi.list(signal)
    },
    idGetter: (_input, scope) => scope,
  })

  public loadOverview = this.createAsyncAction({
    name: PROJECT_ACTION.LOAD_OVERVIEW,
    run: (signal: AbortSignal, projectId: string) => projectsApi.get(projectId, signal),
    idGetter: projectId => projectId,
  })
}

import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import { projectsApi, type CreateProjectInput } from '../../api/projects-api'
import { projectIconsApi } from '../../api/project-icons-api'
import { parseCreateProjectApiError } from '../../api/project-api-error'
import type { DocumentContent } from '../../../../../shared/documents/contracts'
import type { ProjectDescriptionResponse, ProjectIconResponse } from '../../../../../shared/projects/contracts'
import { PROJECTS_SCOPE, type CreateProjectActionResult, type ProjectsListResult, type ProjectsScope } from './types'

const loadProjects = async (scope: ProjectsScope, signal: AbortSignal, cursor?: string): Promise<ProjectsListResult> => {
  if (scope === PROJECTS_SCOPE.ADMINISTRATION) {
    const response = await projectsApi.listAdministration(signal, cursor)
    return { scope, projects: response.items, nextCursor: response.nextCursor }
  }
  const response = await projectsApi.list(signal, cursor)
  return { scope, projects: response.items, nextCursor: response.nextCursor }
}

export const PROJECT_ACTION = {
  LOAD: 'projects.load',
  CREATE: 'project.create',
  LOAD_OVERVIEW: 'project.overview.load',
  SAVE_GENERAL_SETTINGS: 'project.general-settings.save',
  LOAD_MEMBERS: 'project.members.load',
} as const

export interface SaveProjectGeneralSettingsInput {
  readonly content: DocumentContent
  readonly iconFile: File | null
  readonly removeIcon: boolean
}

export interface SaveProjectGeneralSettingsResult {
  readonly description: ProjectDescriptionResponse
  readonly icon: ProjectIconResponse | null
}

export class ProjectsActions extends BaseActions {
  constructor(options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'projects' })
  }

  public load = this.createAsyncAction({
    name: PROJECT_ACTION.LOAD,
    run: (signal: AbortSignal, scope: ProjectsScope, cursor?: string) => loadProjects(scope, signal, cursor),
    idGetter: (scope: ProjectsScope, _cursor?: string) => scope,
  })

  public create = this.createAsyncAction({
    name: PROJECT_ACTION.CREATE,
    run: async (signal: AbortSignal, input: CreateProjectInput, scope: ProjectsScope): Promise<CreateProjectActionResult> => {
      const created = await projectsApi.create(input, signal)
      return { created, list: await loadProjects(scope, signal) }
    },
    idGetter: (_input, scope) => scope,
    options: { errorParser: parseCreateProjectApiError },
  })

  public loadOverview = this.createAsyncAction({
    name: PROJECT_ACTION.LOAD_OVERVIEW,
    run: (signal: AbortSignal, projectId: string) => projectsApi.get(projectId, signal),
    idGetter: projectId => projectId,
  })

  public saveGeneralSettings = this.createAsyncAction({
    name: PROJECT_ACTION.SAVE_GENERAL_SETTINGS,
    run: async (
      signal: AbortSignal,
      projectId: string,
      input: SaveProjectGeneralSettingsInput,
    ): Promise<SaveProjectGeneralSettingsResult> => {
      const description = await projectsApi.updateDescription(projectId, { content: input.content }, signal)
      const icon = input.iconFile
        ? await projectIconsApi.upload(projectId, input.iconFile, signal)
        : input.removeIcon
          ? await projectIconsApi.remove(projectId, signal)
          : null
      return { description, icon }
    },
    idGetter: projectId => projectId,
  })

  public loadMembers = this.createAsyncAction({
    name: PROJECT_ACTION.LOAD_MEMBERS,
    run: (signal: AbortSignal, projectId: string) => projectsApi.listMembers(projectId, signal),
    idGetter: projectId => projectId,
    options: { concurrency: 'abort', mutation: false },
  })
}

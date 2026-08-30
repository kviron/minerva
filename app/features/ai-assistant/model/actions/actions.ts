import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import type { ProjectAiConnectionUpsertRequest } from '../../../../../shared/ai-assistant/contracts'
import { projectAiConnectionsApi } from '../../api/project-ai-connections-api'

export const PROJECT_AI_CONNECTION_ACTION = {
  LOAD: 'project-ai-connection.load',
  SAVE: 'project-ai-connection.save',
  TEST: 'project-ai-connection.test',
  DISCONNECT: 'project-ai-connection.disconnect',
} as const

export class ProjectAiConnectionActions extends BaseActions {
  constructor(options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'project-ai-connection' })
  }

  public load = this.createAsyncAction({
    name: PROJECT_AI_CONNECTION_ACTION.LOAD,
    run: (signal: AbortSignal, projectId: string) => projectAiConnectionsApi.load(projectId, signal),
    idGetter: projectId => projectId,
    options: { concurrency: 'abort', mutation: false },
  })

  public save = this.createAsyncAction({
    name: PROJECT_AI_CONNECTION_ACTION.SAVE,
    run: (signal: AbortSignal, projectId: string, input: ProjectAiConnectionUpsertRequest) =>
      projectAiConnectionsApi.save(projectId, input, signal),
    idGetter: projectId => projectId,
  })

  public test = this.createAsyncAction({
    name: PROJECT_AI_CONNECTION_ACTION.TEST,
    run: (signal: AbortSignal, projectId: string) => projectAiConnectionsApi.test(projectId, signal),
    idGetter: projectId => projectId,
  })

  public disconnect = this.createAsyncAction({
    name: PROJECT_AI_CONNECTION_ACTION.DISCONNECT,
    run: (signal: AbortSignal, projectId: string) => projectAiConnectionsApi.disconnect(projectId, signal),
    idGetter: projectId => projectId,
  })
}

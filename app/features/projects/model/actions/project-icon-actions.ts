import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import { projectIconsApi } from '../../api/project-icons-api'

export const PROJECT_ICON_ACTION = {
  UPLOAD: 'project.icon.upload',
  REMOVE: 'project.icon.remove',
} as const

export class ProjectIconActions extends BaseActions {
  constructor(private readonly projectId: string, options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'project-icon' })
  }

  public upload = this.createAsyncAction({
    name: PROJECT_ICON_ACTION.UPLOAD,
    run: (signal: AbortSignal, file: File) => projectIconsApi.upload(this.projectId, file, signal),
  })

  public remove = this.createAsyncAction({
    name: PROJECT_ICON_ACTION.REMOVE,
    run: (signal: AbortSignal) => projectIconsApi.remove(this.projectId, signal),
  })
}

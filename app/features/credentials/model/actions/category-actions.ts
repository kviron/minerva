import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import type { CredentialCategoryManagement } from '../../../../../shared/credentials/category-contracts'
import { categoryApi } from '../../api/category-api'
import type { CategorySaveCommand } from '../category-management-state'

export const CREDENTIAL_CATEGORY_ACTION = {
  LOAD: 'categories.load',
  SAVE: 'category.save',
  ARCHIVE: 'category.archive',
} as const

export type CredentialCategorySaveResult = Readonly<{
  categoryId: string
  management: CredentialCategoryManagement
}>

export class CredentialCategoryActions extends BaseActions {
  constructor(private readonly projectId: string, options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'credential-categories' })
  }

  public load = this.createAsyncAction({
    name: CREDENTIAL_CATEGORY_ACTION.LOAD,
    run: (signal: AbortSignal) => categoryApi.load(this.projectId, signal),
  })

  public save = this.createAsyncAction({
    name: CREDENTIAL_CATEGORY_ACTION.SAVE,
    run: async (signal: AbortSignal, command: CategorySaveCommand): Promise<CredentialCategorySaveResult> => {
      const categoryId = command.categoryId
        ?? (await categoryApi.create(this.projectId, command.body, signal)).categoryId
      if (command.categoryId) {
        await categoryApi.update(this.projectId, categoryId, command.body, signal)
      }
      if (command.grants) {
        await categoryApi.replaceGrants(this.projectId, categoryId, command.grants, signal)
      }
      const management = await categoryApi.load(this.projectId, signal)
      return { categoryId, management }
    },
    idGetter: command => command.categoryId ?? 'new',
  })

  public archive = this.createAsyncAction({
    name: CREDENTIAL_CATEGORY_ACTION.ARCHIVE,
    run: async (signal: AbortSignal, categoryId: string) => {
      await categoryApi.archive(this.projectId, categoryId, signal)
      return await categoryApi.load(this.projectId, signal)
    },
    idGetter: categoryId => categoryId,
  })
}

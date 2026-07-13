import { inject, provide, type InjectionKey } from 'vue'
import type { DocumentsActions } from './actions'

const DocumentsActionsKey: InjectionKey<DocumentsActions> = Symbol('DocumentsActions')

export const provideDocumentsActions = (actions: DocumentsActions): void => {
  provide(DocumentsActionsKey, actions)
}

export const useDocumentsActions = (): DocumentsActions => {
  const actions = inject(DocumentsActionsKey)
  if (!actions) {
    throw new Error('useDocumentsActions must be used inside DocumentsProvider')
  }
  return actions
}

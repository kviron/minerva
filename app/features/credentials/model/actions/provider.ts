import { inject, provide, type InjectionKey } from 'vue'
import type { CredentialsActions } from './actions'
import type { CredentialCategoryActions } from './category-actions'

const CredentialsActionsKey: InjectionKey<CredentialsActions> = Symbol('CredentialsActions')
const CredentialCategoryActionsKey: InjectionKey<CredentialCategoryActions> = Symbol('CredentialCategoryActions')

export const provideCredentialsActions = (actions: CredentialsActions): void => {
  provide(CredentialsActionsKey, actions)
}

export const provideCredentialCategoryActions = (actions: CredentialCategoryActions): void => {
  provide(CredentialCategoryActionsKey, actions)
}

export const useCredentialsActions = (): CredentialsActions => {
  const actions = inject(CredentialsActionsKey)
  if (!actions) {
    throw new Error('useCredentialsActions must be used inside the Credentials feature provider')
  }
  return actions
}

export const useCredentialCategoryActions = (): CredentialCategoryActions => {
  const actions = inject(CredentialCategoryActionsKey)
  if (!actions) {
    throw new Error('useCredentialCategoryActions must be used inside the Credentials feature provider')
  }
  return actions
}

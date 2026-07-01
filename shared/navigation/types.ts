import type { GLOBAL_NAVIGATION } from './constants'

export type NavigationDefinition =
  (typeof GLOBAL_NAVIGATION)[keyof typeof GLOBAL_NAVIGATION]

export type GlobalNavigationItem = Readonly<{
  id: NavigationDefinition['id']
  labelKey: NavigationDefinition['labelKey']
  to: NavigationDefinition['to']
  icon: NavigationDefinition['icon']
}>

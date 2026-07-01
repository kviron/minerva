import type { GLOBAL_NAVIGATION } from './constants'

export type NavigationDefinition =
  (typeof GLOBAL_NAVIGATION)[keyof typeof GLOBAL_NAVIGATION]

export type GlobalNavigationItemId = NavigationDefinition['id']
export type GlobalNavigationLabelKey = NavigationDefinition['labelKey']
export type GlobalNavigationPath = NavigationDefinition['to']
export type GlobalNavigationIcon = NavigationDefinition['icon']

export type GlobalNavigationItem = Readonly<{
  id: GlobalNavigationItemId
  labelKey: GlobalNavigationLabelKey
  to: GlobalNavigationPath
  icon: GlobalNavigationIcon
}>

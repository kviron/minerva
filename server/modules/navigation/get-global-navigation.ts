import { GLOBAL_NAVIGATION } from '../../../shared/navigation/constants'
import type { GlobalNavigationItem } from '../../../shared/navigation/types'

type NavigationSession = Readonly<{
  user: Readonly<{
    superAdmin?: boolean
  }>
}>

const BASE_NAVIGATION = [
  GLOBAL_NAVIGATION.DASHBOARD,
  GLOBAL_NAVIGATION.PROJECTS,
  GLOBAL_NAVIGATION.SETTINGS,
] satisfies readonly GlobalNavigationItem[]

export function getGlobalNavigation(
  session: NavigationSession,
): readonly GlobalNavigationItem[] {
  return session.user.superAdmin === true
    ? [...BASE_NAVIGATION, GLOBAL_NAVIGATION.ADMINISTRATION]
    : BASE_NAVIGATION
}

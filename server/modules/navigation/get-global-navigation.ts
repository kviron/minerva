import { GLOBAL_NAVIGATION } from '../../../shared/navigation/constants'
import type { GlobalNavigationItem } from '../../../shared/navigation/types'

type NavigationSession = Readonly<{
  user: Readonly<{
    superAdmin?: boolean
  }>
}>

export function getGlobalNavigation(
  session: NavigationSession,
): readonly GlobalNavigationItem[] {
  const baseNavigation = [
    GLOBAL_NAVIGATION.DASHBOARD,
    GLOBAL_NAVIGATION.PROJECTS,
    GLOBAL_NAVIGATION.SETTINGS,
  ] satisfies readonly GlobalNavigationItem[]

  return session.user.superAdmin === true
    ? [...baseNavigation, GLOBAL_NAVIGATION.ADMINISTRATION]
    : baseNavigation
}

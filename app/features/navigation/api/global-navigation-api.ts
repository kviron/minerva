import type { GlobalNavigationItem } from '../../../../shared/navigation/types'

export type GlobalNavigationRequest = () => Promise<readonly GlobalNavigationItem[]>

export const createGlobalNavigationApi = (request: GlobalNavigationRequest) => ({ load: request })

export const globalNavigationApi = createGlobalNavigationApi(
  () => $fetch<GlobalNavigationItem[]>('/api/mainMenu'),
)

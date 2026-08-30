import type { GlobalNavigationItem } from '../../../../shared/navigation/types'
import { globalNavigationResponseSchema } from '../../../../shared/navigation/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export type GlobalNavigationRequest = () => Promise<unknown>

export const createGlobalNavigationApi = (request: GlobalNavigationRequest) => ({
  async load(): Promise<readonly GlobalNavigationItem[]> {
    return decodeApiResponse(globalNavigationResponseSchema, await request(), 'GET /api/mainMenu')
  },
})

export const globalNavigationApi = createGlobalNavigationApi(
  () => $fetch<unknown>('/api/mainMenu'),
)

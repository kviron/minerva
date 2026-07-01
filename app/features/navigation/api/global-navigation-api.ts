import type { GlobalNavigationItem } from '../../../../shared/navigation/types'
import { GLOBAL_NAVIGATION } from '../../../../shared/navigation/constants'

export type GlobalNavigationRequest = () => Promise<unknown>

const definitions: readonly GlobalNavigationItem[] = Object.values(GLOBAL_NAVIGATION)

function isGlobalNavigationItem(value: unknown): value is GlobalNavigationItem {
  if (!value || typeof value !== 'object' || Object.keys(value).length !== 4)
    return false

  return definitions.some(definition => (
    definition.id === Reflect.get(value, 'id')
    && definition.labelKey === Reflect.get(value, 'labelKey')
    && definition.to === Reflect.get(value, 'to')
    && definition.icon === Reflect.get(value, 'icon')
  ))
}

function parseGlobalNavigationResponse(value: unknown): readonly GlobalNavigationItem[] {
  if (!Array.isArray(value) || !value.every(isGlobalNavigationItem))
    throw new Error('Invalid global navigation response')

  return value
}

export const createGlobalNavigationApi = (request: GlobalNavigationRequest) => ({
  load: async (): Promise<readonly GlobalNavigationItem[]> => (
    parseGlobalNavigationResponse(await request())
  ),
})

export const globalNavigationApi = createGlobalNavigationApi(
  () => $fetch<unknown>('/api/mainMenu'),
)

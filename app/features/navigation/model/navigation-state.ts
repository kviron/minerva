import type { GlobalNavigationItem } from '../../../../shared/navigation/types'
import { ref } from 'vue'

const NAVIGATION_LOAD_ERROR = 'Не удалось загрузить меню'

export function createGlobalNavigationState(
  loadItems: () => Promise<readonly GlobalNavigationItem[]>,
) {
  const items = ref<readonly GlobalNavigationItem[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)
  let inFlight: Promise<void> | null = null

  function load(): Promise<void> {
    if (inFlight)
      return inFlight

    pending.value = true
    error.value = null

    inFlight = loadItems()
      .then((loadedItems) => {
        items.value = loadedItems
      })
      .catch(() => {
        error.value = NAVIGATION_LOAD_ERROR
      })
      .finally(() => {
        pending.value = false
        inFlight = null
      })

    return inFlight
  }

  return { items, pending, error, load }
}

export function isGlobalNavigationItemActive(
  item: GlobalNavigationItem,
  path: string,
): boolean {
  return item.id === 'dashboard'
    ? path === item.to
    : path === item.to || path.startsWith(`${item.to}/`)
}

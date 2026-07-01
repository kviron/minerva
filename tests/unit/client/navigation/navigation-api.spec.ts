import { describe, expect, it, vi } from 'vitest'
import { GLOBAL_NAVIGATION } from '../../../../shared/navigation/constants'
import { createGlobalNavigationApi } from '../../../../app/features/navigation/api/global-navigation-api'

describe('global navigation API', () => {
  it('returns the exact items from one request', async () => {
    const items = [GLOBAL_NAVIGATION.DASHBOARD, GLOBAL_NAVIGATION.PROJECTS]
    const request = vi.fn().mockResolvedValue(items)
    const api = createGlobalNavigationApi(request)

    await expect(api.load()).resolves.toBe(items)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith()
  })

  it.each([
    null,
    {},
    [{ ...GLOBAL_NAVIGATION.DASHBOARD, icon: 'unknown-icon' }],
    [{ ...GLOBAL_NAVIGATION.DASHBOARD, to: '/administration' }],
    [{ id: 'unknown', labelKey: 'navigation.dashboard', to: '/dashboard', icon: 'layout-dashboard' }],
  ])('rejects malformed or unknown transport data %#', async (response) => {
    const api = createGlobalNavigationApi(vi.fn().mockResolvedValue(response))

    await expect(api.load()).rejects.toThrow('Invalid global navigation response')
  })
})

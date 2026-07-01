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
})

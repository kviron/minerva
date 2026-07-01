import type { GlobalNavigationItem } from '../../../../shared/navigation/types'
import { CircleHelp, FolderKanban, LayoutDashboard, Settings, ShieldCheck } from '@lucide/vue'
import { describe, expect, it, vi } from 'vitest'
import { GLOBAL_NAVIGATION } from '../../../../shared/navigation/constants'
import { resolveNavigationIcon } from '../../../../app/features/navigation/model/icon-registry'
import { translateNavigationLabel } from '../../../../app/features/navigation/model/labels'
import {
  createGlobalNavigationState,
  isGlobalNavigationItemActive,
} from '../../../../app/features/navigation/model/navigation-state'

describe('global navigation state', () => {
  it('exposes pending while loading and stores returned items', async () => {
    let resolve!: (items: readonly GlobalNavigationItem[]) => void
    const request = new Promise<readonly GlobalNavigationItem[]>((done) => { resolve = done })
    const state = createGlobalNavigationState(() => request)

    const loading = state.load()
    expect(state.pending.value).toBe(true)
    expect(state.error.value).toBeNull()

    resolve([GLOBAL_NAVIGATION.DASHBOARD])
    await loading
    expect(state.items.value).toEqual([GLOBAL_NAVIGATION.DASHBOARD])
    expect(state.pending.value).toBe(false)
  })

  it('reports a safe Russian error and retries', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('private transport detail'))
      .mockResolvedValueOnce([GLOBAL_NAVIGATION.DASHBOARD])
    const state = createGlobalNavigationState(load)

    await state.load()
    expect(state.error.value).toBe('Не удалось загрузить меню')
    expect(state.pending.value).toBe(false)

    await state.load()
    expect(state.items.value).toEqual([GLOBAL_NAVIGATION.DASHBOARD])
    expect(state.error.value).toBeNull()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('coalesces duplicate loads while a request is pending', async () => {
    let resolve!: (items: readonly GlobalNavigationItem[]) => void
    const request = new Promise<readonly GlobalNavigationItem[]>((done) => { resolve = done })
    const load = vi.fn(() => request)
    const state = createGlobalNavigationState(load)

    const first = state.load()
    const duplicate = state.load()
    expect(load).toHaveBeenCalledTimes(1)

    resolve([GLOBAL_NAVIGATION.PROJECTS])
    await Promise.all([first, duplicate])
    expect(state.items.value).toEqual([GLOBAL_NAVIGATION.PROJECTS])
    expect(state.pending.value).toBe(false)
  })
})

describe('global navigation presentation helpers', () => {
  it('matches Dashboard exactly and descendants for every other root', () => {
    expect(isGlobalNavigationItemActive(GLOBAL_NAVIGATION.DASHBOARD, '/dashboard')).toBe(true)
    expect(isGlobalNavigationItemActive(GLOBAL_NAVIGATION.DASHBOARD, '/dashboard/stats')).toBe(false)

    for (const item of [
      GLOBAL_NAVIGATION.PROJECTS,
      GLOBAL_NAVIGATION.SETTINGS,
      GLOBAL_NAVIGATION.ADMINISTRATION,
    ]) {
      expect(isGlobalNavigationItemActive(item, item.to)).toBe(true)
      expect(isGlobalNavigationItemActive(item, `${item.to}/child`)).toBe(true)
      expect(isGlobalNavigationItemActive(item, `${item.to}-other`)).toBe(false)
    }
  })

  it('translates every closed label to Russian', () => {
    expect(Object.values(GLOBAL_NAVIGATION).map(item => translateNavigationLabel(item.labelKey))).toEqual([
      'Главная',
      'Проекты',
      'Настройки',
      'Администрирование',
    ])
  })

  it('resolves every closed icon and safely falls back for an unknown runtime string', () => {
    expect(Object.values(GLOBAL_NAVIGATION).map(item => resolveNavigationIcon(item.icon))).toEqual([
      LayoutDashboard,
      FolderKanban,
      Settings,
      ShieldCheck,
    ])
    expect(resolveNavigationIcon('unknown-from-server')).toBe(CircleHelp)
  })
})

import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { SETTINGS_TAB, SETTINGS_TABS } from '../../../../app/features/settings/model/settings-tabs'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('settings tabs', () => {
  it('defines the canonical personal settings categories', () => {
    expect(SETTINGS_TAB).toEqual({
      PROFILE: 'profile',
      APPLICATION: 'application',
      SECURITY: 'security',
      CONNECTIONS: 'connections',
    })
    expect(SETTINGS_TABS).toEqual([
      { value: 'profile', label: 'Профиль', to: '/settings/profile' },
      { value: 'application', label: 'Приложение', to: '/settings/application' },
      { value: 'security', label: 'Безопасность', to: '/settings/security' },
      { value: 'connections', label: 'Подключения', to: '/settings/connections' },
    ])
  })

  it('uses the same compact accessible Tabs composition as administration', async () => {
    const source = await read('../../../../app/features/settings/ui/SettingsTabs.vue')

    expect(source).toContain('<UiTabs :model-value="active">')
    expect(source).toContain('<div class="max-w-full overflow-x-auto overflow-y-hidden">')
    expect(source).toContain('<UiTabsList>')
    expect(source).toContain('<UiTabsTrigger')
    expect(source).toContain('<NuxtLink')
    expect(source).not.toMatch(/<UiTabsList[^>]*\bw-full\b/)
  })

  it('connects the correct active tab to every settings route', async () => {
    const [index, profile, application, security, connections] = await Promise.all([
      read('../../../../app/pages/settings/index.vue'),
      read('../../../../app/pages/settings/profile.vue'),
      read('../../../../app/pages/settings/application.vue'),
      read('../../../../app/pages/settings/security.vue'),
      read('../../../../app/pages/settings/connections.vue'),
    ])

    expect(index).toContain('<SettingsHeader active="profile" />')
    expect(profile).toContain('<SettingsHeader active="profile" />')
    expect(application).toContain('<SettingsHeader active="application" />')
    expect(security).toContain('<SettingsHeader active="security" />')
    expect(connections).toContain('<SettingsHeader active="connections" />')
    for (const page of [index, profile, application, security, connections])
      expect(page).toContain("from '@/features/settings'")
  })

  it('shows one shared settings heading above the tabs', async () => {
    const source = await read('../../../../app/features/settings/ui/SettingsHeader.vue')

    expect(source).toContain('<header class="flex flex-col gap-4 px-4 lg:px-6">')
    expect(source).not.toMatch(/<header[^>]*\bpy-/)
    expect(source).toContain('<h1 class="text-2xl font-semibold">Настройки</h1>')
    expect(source).toContain('Управляйте профилем, безопасностью и подключениями приложения.')
    expect(source).toContain('<SettingsTabs :active="active" />')
  })
})

export const SETTINGS_TAB = {
  PROFILE: 'profile',
  APPLICATION: 'application',
  SECURITY: 'security',
  CONNECTIONS: 'connections',
} as const

export type SettingsTab = typeof SETTINGS_TAB[keyof typeof SETTINGS_TAB]

export const SETTINGS_TABS = [
  { value: SETTINGS_TAB.PROFILE, label: 'Профиль', to: '/settings/profile' },
  { value: SETTINGS_TAB.APPLICATION, label: 'Приложение', to: '/settings/application' },
  { value: SETTINGS_TAB.SECURITY, label: 'Безопасность', to: '/settings/security' },
  { value: SETTINGS_TAB.CONNECTIONS, label: 'Подключения', to: '/settings/connections' },
] as const satisfies readonly Readonly<{
  value: SettingsTab
  label: string
  to: `/settings/${SettingsTab}`
}>[]

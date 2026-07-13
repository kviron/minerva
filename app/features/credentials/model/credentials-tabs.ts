export const CREDENTIALS_TAB = {
  DATA: 'data',
  CATEGORIES: 'categories',
  ARCHIVE: 'archive',
} as const

export type CredentialsTab = typeof CREDENTIALS_TAB[keyof typeof CREDENTIALS_TAB]

export const CREDENTIALS_TABS = [
  { value: CREDENTIALS_TAB.DATA, label: 'Данные' },
  { value: CREDENTIALS_TAB.CATEGORIES, label: 'Категории' },
  { value: CREDENTIALS_TAB.ARCHIVE, label: 'Архив' },
] as const satisfies readonly Readonly<{ value: CredentialsTab, label: string }>[]

import type { GlobalNavigationItem } from '../../../../shared/navigation/types'

const russianLabels: Record<GlobalNavigationItem['labelKey'], string> = {
  'navigation.dashboard': 'Главная',
  'navigation.projects': 'Проекты',
  'navigation.settings': 'Настройки',
  'navigation.administration': 'Администрирование',
}

// Keep transport keys stable; replace this adapter when application i18n lands.
export const translateNavigationLabel = (
  key: GlobalNavigationItem['labelKey'],
): string => russianLabels[key]

export const GLOBAL_NAVIGATION = {
  DASHBOARD: {
    id: 'dashboard',
    labelKey: 'navigation.dashboard',
    to: '/dashboard',
    icon: 'layout-dashboard',
  },
  PROJECTS: {
    id: 'projects',
    labelKey: 'navigation.projects',
    to: '/projects',
    icon: 'folder-kanban',
  },
  SETTINGS: {
    id: 'settings',
    labelKey: 'navigation.settings',
    to: '/settings',
    icon: 'settings',
  },
  ADMINISTRATION: {
    id: 'administration',
    labelKey: 'navigation.administration',
    to: '/administration',
    icon: 'shield-check',
  },
} as const

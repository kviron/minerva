import type { Component } from 'vue'
import type { GlobalNavigationIcon } from '../../../../shared/navigation/types'
import { CircleHelp, FolderKanban, LayoutDashboard, Settings, ShieldCheck } from '@lucide/vue'

const icons = {
  'layout-dashboard': LayoutDashboard,
  'folder-kanban': FolderKanban,
  'settings': Settings,
  'shield-check': ShieldCheck,
} satisfies Record<GlobalNavigationIcon, Component>

export function resolveNavigationIcon(icon: string): Component {
  if (Object.hasOwn(icons, icon))
    return icons[icon as GlobalNavigationIcon]

  if (import.meta.env.DEV)
    console.error('Unknown global navigation icon received:', icon)

  return CircleHelp
}

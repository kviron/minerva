import type { Component } from 'vue'
import { CircleHelp, FolderKanban, LayoutDashboard, Settings, ShieldCheck } from '@lucide/vue'

const icons: Readonly<Record<string, Component>> = {
  'layout-dashboard': LayoutDashboard,
  'folder-kanban': FolderKanban,
  'settings': Settings,
  'shield-check': ShieldCheck,
}

export const resolveNavigationIcon = (icon: string): Component => icons[icon] ?? CircleHelp

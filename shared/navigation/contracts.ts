import { z } from 'zod'
import { GLOBAL_NAVIGATION } from './constants'
import type { GlobalNavigationItem } from './types'

const dashboardNavigationSchema = z.object({
  id: z.literal(GLOBAL_NAVIGATION.DASHBOARD.id),
  labelKey: z.literal(GLOBAL_NAVIGATION.DASHBOARD.labelKey),
  to: z.literal(GLOBAL_NAVIGATION.DASHBOARD.to),
  icon: z.literal(GLOBAL_NAVIGATION.DASHBOARD.icon),
}).strict()

const projectsNavigationSchema = z.object({
  id: z.literal(GLOBAL_NAVIGATION.PROJECTS.id),
  labelKey: z.literal(GLOBAL_NAVIGATION.PROJECTS.labelKey),
  to: z.literal(GLOBAL_NAVIGATION.PROJECTS.to),
  icon: z.literal(GLOBAL_NAVIGATION.PROJECTS.icon),
}).strict()

const settingsNavigationSchema = z.object({
  id: z.literal(GLOBAL_NAVIGATION.SETTINGS.id),
  labelKey: z.literal(GLOBAL_NAVIGATION.SETTINGS.labelKey),
  to: z.literal(GLOBAL_NAVIGATION.SETTINGS.to),
  icon: z.literal(GLOBAL_NAVIGATION.SETTINGS.icon),
}).strict()

const administrationNavigationSchema = z.object({
  id: z.literal(GLOBAL_NAVIGATION.ADMINISTRATION.id),
  labelKey: z.literal(GLOBAL_NAVIGATION.ADMINISTRATION.labelKey),
  to: z.literal(GLOBAL_NAVIGATION.ADMINISTRATION.to),
  icon: z.literal(GLOBAL_NAVIGATION.ADMINISTRATION.icon),
}).strict()

export const globalNavigationItemSchema: z.ZodType<GlobalNavigationItem> = z.discriminatedUnion('id', [
  dashboardNavigationSchema,
  projectsNavigationSchema,
  settingsNavigationSchema,
  administrationNavigationSchema,
]).readonly()

export const globalNavigationResponseSchema: z.ZodType<readonly GlobalNavigationItem[]> = z.array(globalNavigationItemSchema).readonly()

export const PROJECTS_SCOPE = {
  MEMBER: 'member',
  ADMINISTRATION: 'administration',
} as const

export type ProjectsScope = typeof PROJECTS_SCOPE[keyof typeof PROJECTS_SCOPE]

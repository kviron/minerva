export const projectIconUrl = (projectId: string, iconId: string): string =>
  `/api/projects/${projectId}/icon?v=${encodeURIComponent(iconId)}`

export const projectInitials = (name: string): string => {
  const words = name.trim().split(/\s+/u).filter(Boolean)
  return words.slice(0, 2).map(word => word[0]?.toLocaleUpperCase('ru-RU') ?? '').join('') || '•'
}

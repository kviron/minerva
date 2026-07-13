export const projectIdFromPath = (path: string): string | null => {
  const match = /^\/projects\/([^/]+)(?:\/|$)/.exec(path)
  return match?.[1] ?? null
}

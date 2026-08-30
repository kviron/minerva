import { PROJECT_ROLE_KIND } from '../../../shared/projects/constants'
import type { ProjectRoleProjection } from '../../../shared/projects/contracts'
import type { ProjectRoleKey, ProjectRoleKind } from '../../../shared/projects/types'

export const projectRoleProjection = (
  kind: ProjectRoleKind,
  builtInKey: ProjectRoleKey | null,
  displayName: string,
): ProjectRoleProjection => {
  if (kind === PROJECT_ROLE_KIND.BUILT_IN) {
    if (builtInKey === null) throw new Error('Invalid built-in project role')
    return { builtInKey, customName: null }
  }
  if (displayName.length === 0) throw new Error('Invalid custom project role')
  return { builtInKey: null, customName: displayName }
}

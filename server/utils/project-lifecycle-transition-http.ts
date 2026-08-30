import type { ProjectLifecycleTransitionErrorCode } from '../modules/projects/transition-project-lifecycle'

export const projectLifecycleTransitionHttpStatus = (
  code: ProjectLifecycleTransitionErrorCode,
): 404 | 409 | 503 => {
  switch (code) {
    case 'NOT_FOUND':
      return 404
    case 'stale_revision':
    case 'transition_not_allowed':
    case 'transition_id_conflict':
      return 409
    case 'OPERATION_FAILED':
      return 503
  }
}

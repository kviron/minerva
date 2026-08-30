import { CREATE_PROJECT_ERROR } from '../../shared/projects/constants'
import type { CreateProjectErrorCode } from '../modules/projects/create-project'

export const createProjectHttpStatus = (code: CreateProjectErrorCode): number => {
  switch (code) {
    case CREATE_PROJECT_ERROR.AUTH_REQUIRED:
      return 401
    case CREATE_PROJECT_ERROR.ACCOUNT_INACTIVE:
      return 403
    case CREATE_PROJECT_ERROR.INVALID_PROJECT_NAME:
    case CREATE_PROJECT_ERROR.INVALID_PROJECT_DESCRIPTION:
      return 400
    case CREATE_PROJECT_ERROR.PROJECT_CREATE_FAILED:
      return 503
  }
}

import { z } from 'zod'
import {
  createProjectErrorResponseSchema,
  type CreateProjectErrorResponse,
} from '../../../../shared/projects/contracts'

const fetchErrorSchema = z.object({
  data: createProjectErrorResponseSchema,
}).passthrough()

const CREATE_PROJECT_ERROR_MESSAGE: Readonly<Record<CreateProjectErrorResponse['data']['code'], string>> = {
  INVALID_REQUEST: 'Некорректные данные проекта',
  AUTH_REQUIRED: 'Необходимо войти в систему',
  ACCOUNT_INACTIVE: 'Аккаунт недоступен',
  INVALID_PROJECT_NAME: 'Название проекта заполнено некорректно',
  INVALID_PROJECT_DESCRIPTION: 'Описание проекта заполнено некорректно',
  PROJECT_CREATE_FAILED: 'Не удалось создать проект',
}

export const parseCreateProjectApiError = (rawError: unknown): string | undefined => {
  const parsed = fetchErrorSchema.safeParse(rawError)
  return parsed.success
    ? CREATE_PROJECT_ERROR_MESSAGE[parsed.data.data.data.code]
    : undefined
}

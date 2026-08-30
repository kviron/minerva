import { describe, expect, it } from 'vitest'
import { parseCreateProjectApiError } from '../../../../app/features/projects/api/project-api-error'

describe('project API errors', () => {
  it('translates only validated shared error codes', () => {
    expect(parseCreateProjectApiError({
      data: { data: { code: 'INVALID_PROJECT_NAME' } },
    })).toBe('Название проекта заполнено некорректно')
  })

  it('does not expose unknown response details', () => {
    expect(parseCreateProjectApiError({
      data: { data: { code: 'DATABASE_FAILED', detail: 'private SQL' } },
    })).toBeUndefined()
    expect(parseCreateProjectApiError(new Error('private SQL'))).toBeUndefined()
  })
})

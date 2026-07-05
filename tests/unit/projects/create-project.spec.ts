import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import {
  createProjectWith,
  validateCreateProject,
  type CreateProjectDependencies,
  type CreateProjectErrorCode,
} from '../../../server/modules/projects/create-project'

const validInput = {
  actor: { userId: 'user-1', accountStatus: ACCOUNT_STATUS.ACTIVE },
  channel: AUDIT_CHANNEL.WEB,
  name: '  Minerva  ',
  description: '  Knowledge base  ',
} as const

describe('validateCreateProject', () => {
  it('trims a valid name and description', () => {
    expect(validateCreateProject(validInput)).toEqual({
      ok: true,
      value: {
        actorUserId: 'user-1',
        channel: AUDIT_CHANNEL.WEB,
        name: 'Minerva',
        description: 'Knowledge base',
      },
    })
  })

  it.each([null, undefined])('normalizes a %s description to null', (description) => {
    expect(validateCreateProject({ ...validInput, description })).toMatchObject({
      ok: true,
      value: { description: null },
    })
  })

  it('rejects a blank project name', () => {
    expect(validateCreateProject({ ...validInput, name: '   ' })).toEqual({
      ok: false,
      code: 'INVALID_PROJECT_NAME',
    })
  })

  it('rejects a project name longer than 120 characters after trimming', () => {
    expect(validateCreateProject({ ...validInput, name: ` ${'a'.repeat(121)} ` })).toEqual({
      ok: false,
      code: 'INVALID_PROJECT_NAME',
    })
  })

  it('rejects a description longer than 2000 characters after trimming', () => {
    expect(validateCreateProject({ ...validInput, description: ` ${'a'.repeat(2001)} ` })).toEqual({
      ok: false,
      code: 'INVALID_PROJECT_DESCRIPTION',
    })
  })

  it('requires an authenticated actor', () => {
    expect(validateCreateProject({ ...validInput, actor: null })).toEqual({
      ok: false,
      code: 'AUTH_REQUIRED',
    })
  })

  it('rejects an inactive actor', () => {
    expect(validateCreateProject({
      ...validInput,
      actor: { userId: 'user-1', accountStatus: ACCOUNT_STATUS.DISABLED },
    })).toEqual({ ok: false, code: 'ACCOUNT_INACTIVE' })
  })

  it('exposes only the expected failure code union', () => {
    expectTypeOf<CreateProjectErrorCode>().toEqualTypeOf<
      | 'AUTH_REQUIRED'
      | 'ACCOUNT_INACTIVE'
      | 'INVALID_PROJECT_NAME'
      | 'INVALID_PROJECT_DESCRIPTION'
      | 'PROJECT_CREATE_FAILED'
    >()
  })
})

describe('createProjectWith', () => {
  it('persists the validated command and returns its project id', async () => {
    const persist = vi.fn<CreateProjectDependencies['persist']>()
      .mockResolvedValue({ projectId: 'project-1' })

    await expect(createProjectWith({ persist })(validInput)).resolves.toEqual({
      ok: true,
      value: { projectId: 'project-1' },
    })
    expect(persist).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      channel: AUDIT_CHANNEL.WEB,
      name: 'Minerva',
      description: 'Knowledge base',
    })
  })

  it('does not persist invalid domain input', async () => {
    const persist = vi.fn<CreateProjectDependencies['persist']>()

    await expect(createProjectWith({ persist })({ ...validInput, name: '' })).resolves.toEqual({
      ok: false,
      code: 'INVALID_PROJECT_NAME',
    })
    expect(persist).not.toHaveBeenCalled()
  })

  it('classifies every persistence rejection without leaking its details', async () => {
    const persist = vi.fn<CreateProjectDependencies['persist']>()
      .mockRejectedValue(new Error('postgres://secret@private-host/minerva'))

    const result = await createProjectWith({ persist })(validInput)

    expect(result).toEqual({ ok: false, code: 'PROJECT_CREATE_FAILED' })
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(JSON.stringify(result)).not.toContain('private-host')
  })
})

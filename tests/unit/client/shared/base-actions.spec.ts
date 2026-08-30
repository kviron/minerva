import { describe, expect, it, vi } from 'vitest'
import { BaseActions } from '../../../../app/shared/model/baseActions'

class TestActions extends BaseActions {
  seenSignal: AbortSignal | null = null

  run = this.createAsyncAction({
    name: 'run',
    run: async (signal, id: string) => {
      this.seenSignal = signal
      return id.toUpperCase()
    },
    idGetter: id => id,
  })

  fail = this.createAsyncAction({
    name: 'fail',
    run: async (_signal, _id: string) => {
      throw new Error('private detail')
    },
    idGetter: id => id,
    options: {
      errorMessage: 'Безопасная ошибка',
    },
  })

  failWithParser = this.createAsyncAction({
    name: 'fail-with-parser',
    run: async () => {
      throw { data: { code: 'KNOWN' } }
    },
    options: {
      errorParser: rawError => rawError !== null && typeof rawError === 'object'
        ? 'Распознанная ошибка'
        : undefined,
    },
  })

  uppercase = this.createSyncAction({
    name: 'uppercase',
    run: (value: string) => value.toUpperCase(),
    idGetter: value => value,
  })
}

describe('BaseActions', () => {
  it('passes AbortSignal directly to effects', async () => {
    const actions = new TestActions()
    await actions.run('one')
    expect(actions.seenSignal).toBeInstanceOf(AbortSignal)
  })

  it('tracks pending independently by action and target', async () => {
    const actions = new TestActions()
    await expect(actions.run('one')).resolves.toBe('ONE')
    expect(actions.isPendingFor('run', 'one')).toBe(false)
    expect(actions.pendingMap.value).toEqual({})
  })

  it('creates synchronous actions from the same named-field definition', () => {
    const actions = new TestActions()
    expect(actions.uppercase('one')).toBe('ONE')
    expect(actions.error.value).toBeNull()
  })

  it('returns undefined and exposes only configured safe errors', async () => {
    const actions = new TestActions({ tracker: vi.fn() })
    await expect(actions.fail('one')).resolves.toBeUndefined()
    expect(actions.error.value).toBe('Безопасная ошибка')
    expect(actions.error.value).not.toContain('private detail')
  })

  it('allows a feature to translate a validated API error', async () => {
    const actions = new TestActions()

    await actions.failWithParser()

    expect(actions.error.value).toBe('Распознанная ошибка')
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCredentialsStore } from '../../../../app/features/credentials/model/credentials-state'

beforeEach(() => setActivePinia(createPinia()))

describe('credentials Pinia store', () => {
  it('stores loaded projections independently from API actions', () => {
    const store = useCredentialsStore()
    store.applyRows([])
    store.applyArchivedRows([{
      id: 'archived-1',
      title: 'Old account',
      category: { id: 'category-1', name: 'Servers' },
      hasLogin: true,
      hasPassword: false,
      dynamicFieldCount: 0,
      archivedAt: '2026-07-13T10:00:00.000Z',
      archivedBy: { name: 'Admin' },
    }])
    expect(store.rows).toEqual([])
    expect(store.archivedRows).toHaveLength(1)
  })

  it('builds an explicit create command from its editor draft', () => {
    const store = useCredentialsStore()
    store.openCreate('category-1')
    store.title = ' Production '
    store.loginValue = 'admin'
    store.passwordValue = 'secret'

    expect(store.toSaveCommand()).toEqual({
      kind: 'create',
      body: {
        categoryId: 'category-1',
        title: 'Production',
        login: 'admin',
        password: 'secret',
        fields: [],
      },
    })
  })

  it('clears plaintext when the editor closes', () => {
    const store = useCredentialsStore()
    store.openCreate('category-1')
    store.loginValue = 'admin'
    store.passwordValue = 'secret'

    store.setEditorOpen(false)

    expect(store.editorOpen).toBe(false)
    expect(store.loginValue).toBe('')
    expect(store.passwordValue).toBe('')
  })

  it('loads the visible login into the editor and saves changes explicitly', () => {
    const store = useCredentialsStore()
    store.openEdit({
      id: 'credential-1',
      title: 'Production',
      category: { id: 'category-1', name: 'Servers' },
      login: 'old-login',
      hasLogin: true,
      hasPassword: true,
      dynamicFields: [],
      updatedAt: '2026-07-13T10:00:00.000Z',
      updatedBy: { name: 'Admin', avatar: null },
      canUpdate: true,
      canArchive: true,
    })

    expect(store.loginValue).toBe('old-login')
    store.loginValue = 'new-login'
    expect(store.toSaveCommand()).toMatchObject({
      kind: 'update',
      body: { login: { kind: 'replace', value: 'new-login' } },
    })

    store.clearLogin()
    expect(store.loginValue).toBe('')
    expect(store.toSaveCommand()).toMatchObject({
      kind: 'update',
      body: { login: { kind: 'clear' } },
    })

    store.applyRevealedPassword('old-password')
    expect(store.passwordValue).toBe('old-password')
    expect(store.toSaveCommand()).toMatchObject({
      kind: 'update',
      body: { password: { kind: 'keep' } },
    })

    store.setPasswordValue('new-password')
    expect(store.toSaveCommand()).toMatchObject({
      kind: 'update',
      body: { password: { kind: 'replace', value: 'new-password' } },
    })

    store.clearPassword()
    expect(store.passwordValue).toBe('')
    expect(store.toSaveCommand()).toMatchObject({
      kind: 'update',
      body: { password: { kind: 'clear' } },
    })
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCredentialsStore } from '../../../../app/features/credentials/model/credentials-state'

beforeEach(() => setActivePinia(createPinia()))

describe('credentials Pinia store', () => {
  it('stores loaded projections independently from API actions', () => {
    const store = useCredentialsStore()
    store.applyRows([])
    expect(store.rows).toEqual([])
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
})

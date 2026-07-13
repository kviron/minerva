import { defineStore } from 'pinia'
import type { MaskedCredentialListItem } from '../../../../shared/credentials/contracts'
import type { CredentialFieldType } from '../../../../shared/credentials/types'
import type { CredentialCreateBody, CredentialUpdateBody, SecretOperation } from './actions/types'

export type SecretMode = 'keep' | 'replace' | 'clear'
export type DynamicFieldDraft = {
  id?: string
  label: string
  type: CredentialFieldType
  mode: SecretMode
  value: string
}
export type CredentialSaveCommand =
  | Readonly<{ kind: 'create', body: CredentialCreateBody }>
  | Readonly<{ kind: 'update', credentialId: string, body: CredentialUpdateBody }>

interface CredentialsState {
  rows: MaskedCredentialListItem[]
  editorOpen: boolean
  editingId: string | null
  title: string
  categoryId: string
  loginMode: SecretMode
  loginValue: string
  passwordMode: SecretMode
  passwordValue: string
  fields: DynamicFieldDraft[]
  revealedPasswords: Record<string, string>
  copiedKey: string | null
}

const operation = (mode: SecretMode, value: string): SecretOperation =>
  mode === 'replace' ? { kind: 'replace', value } : { kind: mode }

export const useCredentialsStore = defineStore('credentials', {
  state: (): CredentialsState => ({
    rows: [],
    editorOpen: false,
    editingId: null,
    title: '',
    categoryId: '',
    loginMode: 'replace',
    loginValue: '',
    passwordMode: 'replace',
    passwordValue: '',
    fields: [],
    revealedPasswords: {},
    copiedKey: null,
  }),

  actions: {
    applyRows(value: readonly MaskedCredentialListItem[]) {
      this.rows = [...value]
    },

    setEditorOpen(open: boolean) {
      this.editorOpen = open
      if (!open) {
        this.clearPlaintext()
      }
    },

    clearPlaintext() {
      this.loginValue = ''
      this.passwordValue = ''
      this.fields = this.fields.map(field => ({ ...field, value: '' }))
    },

    openCreate(initialCategoryId: string) {
      this.editingId = null
      this.title = ''
      this.categoryId = initialCategoryId
      this.loginMode = 'replace'
      this.loginValue = ''
      this.passwordMode = 'replace'
      this.passwordValue = ''
      this.fields = []
      this.editorOpen = true
    },

    openEdit(row: MaskedCredentialListItem) {
      this.editingId = row.id
      this.title = row.title
      this.categoryId = row.category.id
      this.loginMode = row.hasLogin ? 'keep' : 'clear'
      this.loginValue = ''
      this.passwordMode = row.hasPassword ? 'keep' : 'clear'
      this.passwordValue = ''
      this.fields = row.dynamicFields.map(field => ({ ...field, mode: 'keep', value: '' }))
      this.editorOpen = true
    },

    addField() {
      this.fields = [...this.fields, { label: '', type: 'text', mode: 'replace', value: '' }]
    },

    removeField(index: number) {
      this.fields = this.fields.filter((_, itemIndex) => itemIndex !== index)
    },

    moveField(index: number, offset: number) {
      const target = index + offset
      if (target < 0 || target >= this.fields.length) {
        return
      }
      const next = [...this.fields]
      const field = next[index]
      if (!field) {
        return
      }
      next.splice(index, 1)
      next.splice(target, 0, field)
      this.fields = next
    },

    toSaveCommand(): CredentialSaveCommand | null {
      const normalizedTitle = this.title.trim()
      if (!normalizedTitle || !this.categoryId) {
        return null
      }
      if (this.editingId) {
        return {
          kind: 'update',
          credentialId: this.editingId,
          body: {
            categoryId: this.categoryId,
            title: normalizedTitle,
            login: operation(this.loginMode, this.loginValue),
            password: operation(this.passwordMode, this.passwordValue),
            fields: this.fields.map(field => ({
              id: field.id,
              label: field.label,
              type: field.type,
              value: operation(field.mode, field.value),
            })),
          },
        }
      }
      return {
        kind: 'create',
        body: {
          categoryId: this.categoryId,
          title: normalizedTitle,
          login: this.loginMode === 'replace' ? this.loginValue : null,
          password: this.passwordMode === 'replace' ? this.passwordValue : null,
          fields: this.fields.map(field => ({ label: field.label, type: field.type, value: field.value })),
        },
      }
    },

    setRevealedPassword(id: string, value: string) {
      this.revealedPasswords = { ...this.revealedPasswords, [id]: value }
    },

    clearRevealedPassword(id: string) {
      const next = { ...this.revealedPasswords }
      delete next[id]
      this.revealedPasswords = next
    },

    setCopiedKey(value: string | null) {
      this.copiedKey = value
    },
  },
})

export type CredentialsStore = ReturnType<typeof useCredentialsStore>

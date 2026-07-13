import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('credentials table and editor', () => {
  it('renders visible login controls, protected password controls, and icon menu actions', async () => {
    const table = await read('../../../../app/features/credentials/ui/CredentialsTable.vue')
    for (const heading of ['Название', 'Категория', 'Логин', 'Пароль', 'Изменено']) expect(table).toContain(heading)
    expect(table).toContain('<UiTable')
    expect(table).toContain('••••••••')
    expect(table).toContain('row.login')
    expect(table).toContain('Копировать логин')
    expect(table).toContain('Показать пароль')
    expect(table).toContain('Копировать пароль')
    expect(table).toContain('<Eye')
    expect(table).toContain('<Copy')
    expect(table).toContain('<MoreVertical')
    expect(table).toContain('<UiDropdownMenuItem')
    expect(table).toContain('Редактировать')
    expect(table).toContain('Удалить')
    expect(table).toContain('<Pencil')
    expect(table).toContain('<Trash2')
    expect(table).toContain('<UiHoverCard')
    expect(table).toContain('<UiAvatarFallback>')
    expect(table).toContain('row.updatedBy.name')
    expect(table).toContain('truncate text-base font-semibold')
    expect(table).toContain('text-xs text-muted-foreground">Последнее изменение')
    expect(table).not.toContain('Избранное')
  })

  it('uses a titled Sheet with dynamic fields and explicit secret operations', async () => {
    const editor = await read('../../../../app/features/credentials/ui/CredentialEditorSheet.vue')
    expect(editor).toContain('<UiSheetTitle>')
    expect(editor).toContain('<UiFieldGroup>')
    expect(editor).toContain('Добавить поле')
    expect(editor).toContain('Оставить')
    expect(editor).toContain('Заменить')
    expect(editor).toContain('Очистить')
    expect(editor).toContain('state.moveField')
    expect(editor).toContain('state.removeField')
    expect(editor).toContain(':disabled="actions.isPendingFor')
  })

  it('loads and mutates through strict feature adapters', async () => {
    const [api, state, actions] = await Promise.all([
      read('../../../../app/features/credentials/api/credentials-api.ts'),
      read('../../../../app/features/credentials/model/credentials-state.ts'),
      read('../../../../app/features/credentials/model/actions/actions.ts'),
    ])
    expect(api).toContain('parseCredentialList')
    expect(api).toContain('/api/projects/${projectId}/credentials')
    expect(api).toContain('/reveal')
    expect(actions).toContain('revealPassword')
    expect(actions).toContain('copyPassword')
    expect(api).toContain("method: 'DELETE'")
    expect(actions).toContain('public archive =')
    expect(actions).toContain('createAsyncAction({')
    expect(state).not.toContain('error.message')
    expect(state).toContain('setEditorOpen(open: boolean)')
    expect(state).toContain('clearPlaintext')
  })

  it('confirms credential deletion in a titled AlertDialog', async () => {
    const view = await read('../../../../app/features/credentials/ui/CredentialsView.vue')
    expect(view).toContain('<UiAlertDialogTitle>Удалить учётные данные?</UiAlertDialogTitle>')
    expect(view).toContain('Вы точно хотите удалить')
    expect(view).toContain('@delete="requestDelete"')
  })

  it('filters only masked list data and gates creation by its permission', async () => {
    const [view, contract] = await Promise.all([
      read('../../../../app/features/credentials/ui/CredentialsView.vue'),
      read('../../../../shared/credentials/category-contracts.ts'),
    ])
    expect(view).toContain('visibleRows')
    expect(view).toContain('selectedCategoryId')
    expect(view).toContain('state.canCreateCredentials')
    expect(contract).toContain('canCreateCredentials: boolean')
  })
})

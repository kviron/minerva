<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import { CREDENTIAL_ACTION } from '../model/actions/actions'
import { useCredentialsActions } from '../model/actions/provider'
import { useCategoryManagementStore } from '../model/category-management-state'
import { useCredentialsStore, type SecretMode } from '../model/credentials-state'

const actions = useCredentialsActions()
const state = useCredentialsStore()
const categoryState = useCategoryManagementStore()
const modes: { value: SecretMode, label: string }[] = [
  { value: 'keep', label: 'Оставить' }, { value: 'replace', label: 'Заменить' }, { value: 'clear', label: 'Очистить' },
]
const save = async () => {
  const command = state.toSaveCommand()
  if (!command) {
    return
  }
  const rows = await actions.save(command)
  if (!rows) {
    return
  }
  state.setEditorOpen(false)
  state.applyRows(rows)
}
</script>

<template>
  <UiSheet :open="state.editorOpen" @update:open="state.setEditorOpen">
    <UiSheetContent class="flex w-full flex-col sm:max-w-2xl">
      <UiSheetHeader>
        <UiSheetTitle>{{ state.editingId ? 'Редактировать учётные данные' : 'Новые учётные данные' }}</UiSheetTitle>
        <UiSheetDescription>Секретные значения шифруются и не отображаются после сохранения.</UiSheetDescription>
      </UiSheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-4">
        <UiFieldGroup>
          <UiField>
            <UiFieldLabel for="credential-title">Название</UiFieldLabel>
            <UiInput id="credential-title" v-model="state.title" />
          </UiField>
          <UiField>
            <UiFieldLabel>Категория</UiFieldLabel>
            <UiSelect v-model="state.categoryId" :disabled="!!state.editingId">
              <UiSelectTrigger>
                <UiSelectValue placeholder="Выберите категорию" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectGroup>
                  <UiSelectItem v-for="category in categoryState.categories" :key="category.id" :value="category.id">{{ category.name
                    }}</UiSelectItem>
                </UiSelectGroup>
              </UiSelectContent>
            </UiSelect>
            <UiFieldDescription v-if="state.editingId">Категория существующей записи не меняется, чтобы сохранить
              криптографическую привязку значений.</UiFieldDescription>
          </UiField>
          <UiFieldSet>
            <UiFieldLegend>Логин</UiFieldLegend>
            <UiFieldGroup>
              <UiField v-if="state.editingId">
                <UiFieldLabel>Действие</UiFieldLabel>
                <UiSelect v-model="state.loginMode">
                  <UiSelectTrigger>
                    <UiSelectValue />
                  </UiSelectTrigger>
                  <UiSelectContent>
                    <UiSelectGroup>
                      <UiSelectItem v-for="mode in modes" :key="mode.value" :value="mode.value">{{ mode.label }}
                      </UiSelectItem>
                    </UiSelectGroup>
                  </UiSelectContent>
                </UiSelect>
              </UiField>
              <UiField v-if="!state.editingId || state.loginMode === 'replace'">
                <UiFieldLabel for="credential-login">Новое значение</UiFieldLabel>
                <UiInput id="credential-login" v-model="state.loginValue" autocomplete="off" />
              </UiField>
            </UiFieldGroup>
          </UiFieldSet>
          <UiFieldSet>
            <UiFieldLegend>Пароль</UiFieldLegend>
            <UiFieldGroup>
              <UiField v-if="state.editingId">
                <UiFieldLabel>Действие</UiFieldLabel>
                <UiSelect v-model="state.passwordMode">
                  <UiSelectTrigger>
                    <UiSelectValue />
                  </UiSelectTrigger>
                  <UiSelectContent>
                    <UiSelectGroup>
                      <UiSelectItem v-for="mode in modes" :key="mode.value" :value="mode.value">{{ mode.label }}
                      </UiSelectItem>
                    </UiSelectGroup>
                  </UiSelectContent>
                </UiSelect>
              </UiField>
              <UiField v-if="!state.editingId || state.passwordMode === 'replace'">
                <UiFieldLabel for="credential-password">Новое значение</UiFieldLabel>
                <UiInput id="credential-password" v-model="state.passwordValue" type="password"
                  autocomplete="new-password" />
              </UiField>
            </UiFieldGroup>
          </UiFieldSet>
          <UiFieldSet>
            <div class="flex items-center justify-between gap-2">
              <UiFieldLegend>Дополнительные поля</UiFieldLegend>
              <UiButton type="button" size="sm" variant="outline" @click="state.addField">
                <Plus data-icon="inline-start" />Добавить поле
              </UiButton>
            </div>
            <UiFieldGroup>
              <UiCard v-for="(field, index) in state.fields" :key="field.id ?? index">
                <UiCardContent class="flex flex-col gap-3 pt-4">
                  <div class="flex justify-end gap-1">
                    <UiButton type="button" size="icon" variant="ghost" aria-label="Выше"
                      @click="state.moveField(index, -1)">
                      <ArrowUp />
                    </UiButton>
                    <UiButton type="button" size="icon" variant="ghost" aria-label="Ниже"
                      @click="state.moveField(index, 1)">
                      <ArrowDown />
                    </UiButton>
                    <UiButton type="button" size="icon" variant="ghost" aria-label="Удалить поле"
                      @click="state.removeField(index)">
                      <Trash2 />
                    </UiButton>
                  </div>
                  <UiField>
                    <UiFieldLabel>Название поля</UiFieldLabel>
                    <UiInput v-model="field.label" />
                  </UiField>
                  <UiField>
                    <UiFieldLabel>Тип</UiFieldLabel>
                    <UiSelect v-model="field.type">
                      <UiSelectTrigger>
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectGroup>
                          <UiSelectItem value="text">Текст</UiSelectItem>
                          <UiSelectItem value="secret">Секрет</UiSelectItem>
                          <UiSelectItem value="url">Ссылка</UiSelectItem>
                          <UiSelectItem value="note">Комментарий</UiSelectItem>
                        </UiSelectGroup>
                      </UiSelectContent>
                    </UiSelect>
                  </UiField>
                  <UiField v-if="field.id">
                    <UiFieldLabel>Действие</UiFieldLabel>
                    <UiSelect v-model="field.mode">
                      <UiSelectTrigger>
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectGroup>
                          <UiSelectItem v-for="mode in modes" :key="mode.value" :value="mode.value">{{ mode.label }}
                          </UiSelectItem>
                        </UiSelectGroup>
                      </UiSelectContent>
                    </UiSelect>
                  </UiField>
                  <UiField v-if="!field.id || field.mode === 'replace'">
                    <UiFieldLabel>Значение</UiFieldLabel>
                    <UiTextarea v-if="field.type === 'note'" v-model="field.value" />
                    <UiInput v-else v-model="field.value" :type="field.type === 'secret' ? 'password' : 'text'"
                      autocomplete="off" />
                  </UiField>
                </UiCardContent>
              </UiCard>
            </UiFieldGroup>
          </UiFieldSet>
        </UiFieldGroup>
      </div>
      <UiSheetFooter>
        <UiButton type="button"
          :disabled="actions.isPendingFor(CREDENTIAL_ACTION.SAVE) || !state.title.trim() || !state.categoryId"
          @click="save">
          <UiSpinner v-if="actions.isPendingFor(CREDENTIAL_ACTION.SAVE)" data-icon="inline-start" />Сохранить
        </UiButton>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>

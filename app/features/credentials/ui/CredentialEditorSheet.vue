<script setup lang="ts">
import { Eye, EyeOff, ArrowDown, ArrowUp, Plus, Trash2, X } from '@lucide/vue'
import { ref, watch } from 'vue'
import { CREDENTIAL_ACTION } from '../model/actions/actions'
import { useCredentialsActions } from '../model/actions/provider'
import { useCategoryManagementStore } from '../model/category-management-state'
import { useCredentialsStore, type SecretMode } from '../model/credentials-state'

const actions = useCredentialsActions()
const emit = defineEmits<{ saved: [] }>()
const state = useCredentialsStore()
const categoryState = useCategoryManagementStore()
const passwordVisible = ref(false)
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
  emit('saved')
}
const clearPassword = () => {
  state.clearPassword()
  passwordVisible.value = false
}
const togglePasswordVisibility = async () => {
  if (state.editingId && state.passwordMode === 'keep' && !state.passwordValue) {
    const credentialId = state.editingId
    const value = await actions.revealPassword(state.editingId)
    if (!value || !state.editorOpen || state.editingId !== credentialId) {
      return
    }
    state.applyRevealedPassword(value)
  }
  if (!state.passwordValue) {
    return
  }
  passwordVisible.value = !passwordVisible.value
}

watch(() => state.editorOpen, (open) => {
  if (!open) {
    passwordVisible.value = false
  }
})
</script>

<template>
  <UiSheet :open="state.editorOpen" @update:open="state.setEditorOpen">
    <UiSheetContent class="flex w-full flex-col sm:max-w-2xl">
      <UiSheetHeader>
        <UiSheetTitle>{{ state.editingId ? 'Редактировать учётные данные' : 'Новые учётные данные' }}</UiSheetTitle>
        <UiSheetDescription>Секретные значения шифруются и не отображаются после сохранения.</UiSheetDescription>
      </UiSheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-6">
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
          <UiField>
            <UiFieldLabel for="credential-login">Логин</UiFieldLabel>
            <UiInputGroup>
              <UiInputGroupInput id="credential-login" v-model="state.loginValue" autocomplete="off" />
              <UiInputGroupAddon v-if="state.loginValue" align="inline-end">
                <UiInputGroupButton
                  size="icon-xs"
                  aria-label="Очистить логин"
                  title="Очистить логин"
                  @click="state.clearLogin"
                >
                  <X />
                </UiInputGroupButton>
              </UiInputGroupAddon>
            </UiInputGroup>
          </UiField>
          <UiField>
            <UiFieldLabel for="credential-password">Пароль</UiFieldLabel>
            <UiInputGroup>
              <UiInputGroupInput
                id="credential-password"
                :model-value="state.passwordValue"
                :type="passwordVisible ? 'text' : 'password'"
                :placeholder="state.editingId && state.passwordMode === 'keep' ? '••••••••' : ''"
                autocomplete="new-password"
                @update:model-value="state.setPasswordValue"
              />
              <UiInputGroupAddon align="inline-end">
                <UiInputGroupButton
                  size="icon-xs"
                  :disabled="actions.isPendingFor(CREDENTIAL_ACTION.REVEAL_PASSWORD, state.editingId ?? 'new') || (state.passwordMode !== 'keep' && !state.passwordValue)"
                  :aria-label="passwordVisible ? 'Скрыть пароль' : 'Показать пароль'"
                  :title="passwordVisible ? 'Скрыть пароль' : 'Показать пароль'"
                  @click="togglePasswordVisibility"
                >
                  <UiSpinner v-if="actions.isPendingFor(CREDENTIAL_ACTION.REVEAL_PASSWORD, state.editingId ?? 'new')" />
                  <EyeOff v-else-if="passwordVisible" />
                  <Eye v-else />
                </UiInputGroupButton>
                <UiInputGroupButton
                  v-if="state.passwordValue || state.passwordMode === 'keep'"
                  size="icon-xs"
                  aria-label="Очистить пароль"
                  title="Очистить пароль"
                  @click="clearPassword"
                >
                  <X />
                </UiInputGroupButton>
              </UiInputGroupAddon>
            </UiInputGroup>
          </UiField>
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

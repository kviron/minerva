<script setup lang="ts">
import { CREDENTIAL_CATEGORY_ACTION } from '../model/actions/category-actions'
import { useCredentialCategoryActions } from '../model/actions/provider'
import { useCategoryManagementStore } from '../model/category-management-state'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean], archived: [] }>()
const actions = useCredentialCategoryActions()
const state = useCategoryManagementStore()

const toggle = (values: string[], id: string, checked: boolean) => checked
  ? [...new Set([...values, id])]
  : values.filter(value => value !== id)
const save = async () => {
  const command = state.toSaveCommand()
  if (!command) {
    return
  }
  const result = await actions.save(command)
  if (!result) {
    return
  }
  state.apply(result.management)
  state.select(result.categoryId)
}
const archive = async () => {
  if (!state.selectedId) {
    return
  }
  const management = await actions.archive(state.selectedId)
  if (!management) {
    return
  }
  state.select(null)
  state.apply(management)
  emit('archived')
}
</script>

<template>
  <UiSheet :open="open" @update:open="emit('update:open', $event)">
    <UiSheetContent class="flex w-full flex-col sm:max-w-xl">
      <UiSheetHeader>
        <UiSheetTitle>Управление категориями</UiSheetTitle>
        <UiSheetDescription>Создавайте категории и назначайте доступ ролям или отдельным участникам проекта.
        </UiSheetDescription>
      </UiSheetHeader>

      <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
        <div v-if="state.canManage" class="flex flex-wrap gap-2">
          <UiButton size="sm" variant="outline" @click="state.select(null)">Новая категория</UiButton>
          <UiButton v-for="category in state.categories" :key="category.id" size="sm"
            :variant="state.selectedId === category.id ? 'secondary' : 'ghost'"
            @click="state.select(category.id)">
            {{ category.name }}
          </UiButton>
        </div>

        <UiAlert v-if="actions.error.value" variant="destructive">
          <UiAlertTitle>Не удалось выполнить действие</UiAlertTitle>
          <UiAlertDescription>{{ actions.error.value }}</UiAlertDescription>
        </UiAlert>

        <UiFieldGroup>
          <UiField>
            <UiFieldLabel for="category-name">Название</UiFieldLabel>
            <UiInput id="category-name" v-model="state.name" maxlength="120" placeholder="Например, Продакшен" />
          </UiField>
          <UiField>
            <UiFieldLabel for="category-description">Описание</UiFieldLabel>
            <UiTextarea id="category-description" v-model="state.description" maxlength="2000" />
          </UiField>
          <UiFieldSet v-if="state.canManage">
            <UiFieldLegend>Доступ по ролям</UiFieldLegend>
            <UiFieldDescription>Администраторы проекта всегда имеют доступ и не требуют отдельной отметки.
            </UiFieldDescription>
            <UiFieldGroup>
              <UiField v-for="role in state.roles" :key="role.id" orientation="horizontal">
                <UiCheckbox :id="`role-${role.id}`" :disabled="role.builtInKey === 'admin'"
                  :model-value="role.builtInKey === 'admin' || state.roleIds.includes(role.id)"
                  @update:model-value="state.roleIds = toggle(state.roleIds, role.id, $event === true)" />
                <UiFieldLabel :for="`role-${role.id}`">{{ role.name }}</UiFieldLabel>
              </UiField>
            </UiFieldGroup>
          </UiFieldSet>
          <UiFieldSet v-if="state.canManage">
            <UiFieldLegend>Индивидуальный доступ</UiFieldLegend>
            <UiFieldGroup>
              <UiField v-for="member in state.members" :key="member.membershipId" orientation="horizontal">
                <UiCheckbox :id="`member-${member.membershipId}`"
                  :model-value="state.membershipIds.includes(member.membershipId)"
                  @update:model-value="state.membershipIds = toggle(state.membershipIds, member.membershipId, $event === true)" />
                <UiFieldLabel :for="`member-${member.membershipId}`">{{ member.name }} — {{ member.email }}
                </UiFieldLabel>
              </UiField>
            </UiFieldGroup>
          </UiFieldSet>
        </UiFieldGroup>
      </div>

      <UiSheetFooter>
        <UiAlertDialog v-if="state.canManage && state.selectedId">
          <UiAlertDialogTrigger as-child>
            <UiButton variant="destructive"
              :disabled="actions.isPendingFor(CREDENTIAL_CATEGORY_ACTION.ARCHIVE, state.selectedId)">Архивировать
              категорию</UiButton>
          </UiAlertDialogTrigger>
          <UiAlertDialogContent>
            <UiAlertDialogHeader>
              <UiAlertDialogTitle>Архивировать категорию?</UiAlertDialogTitle>
              <UiAlertDialogDescription>Все её учётные данные также будут архивированы.</UiAlertDialogDescription>
            </UiAlertDialogHeader>
            <UiAlertDialogFooter>
              <UiAlertDialogCancel>Отмена</UiAlertDialogCancel>
              <UiAlertDialogAction @click="archive">Архивировать</UiAlertDialogAction>
            </UiAlertDialogFooter>
          </UiAlertDialogContent>
        </UiAlertDialog>
        <UiButton :disabled="actions.isPendingFor(CREDENTIAL_CATEGORY_ACTION.SAVE) || !state.name.trim()"
          @click="save">
          <UiSpinner v-if="actions.isPendingFor(CREDENTIAL_CATEGORY_ACTION.SAVE)" data-icon="inline-start" />
          Сохранить
        </UiButton>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>

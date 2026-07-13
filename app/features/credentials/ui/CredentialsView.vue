<script setup lang="ts">
import { FolderKey, Plus, Search } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import type { MaskedCredentialListItem } from '../../../../shared/credentials/contracts'
import { CREDENTIAL_ACTION } from '../model/actions/actions'
import { CREDENTIAL_CATEGORY_ACTION } from '../model/actions/category-actions'
import { useCredentialCategoryActions, useCredentialsActions } from '../model/actions/provider'
import { useCategoryManagementStore } from '../model/category-management-state'
import { useCredentialsStore } from '../model/credentials-state'
import CategoryManagementSheet from './CategoryManagementSheet.vue'
import CredentialEditorSheet from './CredentialEditorSheet.vue'
import CredentialsTable from './CredentialsTable.vue'

const actions = useCredentialsActions()
const categoryActions = useCredentialCategoryActions()
const state = useCategoryManagementStore()
const credentials = useCredentialsStore()
const managementOpen = ref(false)
const deleteTarget = ref<MaskedCredentialListItem | null>(null)
const search = ref('')
const selectedCategoryId = ref('all')
const visibleRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru-RU')
  return credentials.rows.filter(row => (
    (selectedCategoryId.value === 'all' || row.category.id === selectedCategoryId.value)
    && (!query || row.title.toLocaleLowerCase('ru-RU').includes(query) || row.category.name.toLocaleLowerCase('ru-RU').includes(query))
  ))
})

const openCreate = () => {
  state.select(null)
  managementOpen.value = true
}

const openCredentialCreate = () => {
  const category = state.categories[0]
  if (!category) {
    return
  }

  credentials.openCreate(category.id)
}

const loadCredentials = async () => {
  const rows = await actions.load()
  if (rows) {
    credentials.applyRows(rows)
  }
}
const loadCategories = async () => {
  const management = await categoryActions.load()
  if (management) {
    state.apply(management)
  }
}
const reload = () => Promise.all([loadCategories(), loadCredentials()])
const requestDelete = (row: MaskedCredentialListItem) => { deleteTarget.value = row }
const updateDeleteOpen = (open: boolean) => {
  if (!open) {
    deleteTarget.value = null
  }
}
const confirmDelete = async () => {
  if (!deleteTarget.value) {
    return
  }
  const credentialId = deleteTarget.value.id
  const rows = await actions.archive(credentialId)
  if (!rows) {
    return
  }
  credentials.clearRevealedPassword(credentialId)
  credentials.applyRows(rows)
  deleteTarget.value = null
}

onMounted(reload)
</script>

<template>
  <div class="flex flex-col gap-4 px-4 lg:px-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold">Учётные данные</h1>
        <p class="text-sm text-muted-foreground">Защищённые логины, пароли и дополнительные поля проекта.</p>
      </div>
      <div v-if="state.canManage || state.canCreateCategories || state.canCreateCredentials" class="flex flex-wrap gap-2">
        <UiButton v-if="state.canManage" variant="outline" @click="managementOpen = true">Управление категориями</UiButton>
        <UiButton v-else-if="state.canCreateCategories" variant="outline" @click="openCreate"><Plus data-icon="inline-start" />Создать категорию</UiButton>
        <UiButton v-if="state.canCreateCredentials && state.categories.length" @click="openCredentialCreate"><Plus data-icon="inline-start" />Новая учётная запись</UiButton>
      </div>
    </div>

    <div v-if="categoryActions.isPendingFor(CREDENTIAL_CATEGORY_ACTION.LOAD) || actions.isPendingFor(CREDENTIAL_ACTION.LOAD)" class="flex flex-col gap-3">
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-48 w-full" />
    </div>
    <UiAlert v-else-if="categoryActions.error.value || actions.error.value" variant="destructive">
      <UiAlertTitle>Не удалось загрузить категории</UiAlertTitle>
      <UiAlertDescription>{{ categoryActions.error.value || actions.error.value }}</UiAlertDescription>
      <UiAlertAction><UiButton size="sm" variant="outline" @click="reload">Повторить</UiButton></UiAlertAction>
    </UiAlert>
    <UiEmpty v-else-if="state.categories.length === 0" class="border border-dashed">
      <UiEmptyHeader>
        <UiEmptyMedia variant="icon"><FolderKey /></UiEmptyMedia>
        <UiEmptyTitle>Категорий пока нет</UiEmptyTitle>
        <UiEmptyDescription>Создайте первую категорию, чтобы добавить и безопасно распределить учётные данные.</UiEmptyDescription>
      </UiEmptyHeader>
      <UiEmptyContent v-if="state.canCreateCategories">
        <UiButton @click="openCreate"><Plus data-icon="inline-start" />Создать категорию</UiButton>
      </UiEmptyContent>
    </UiEmpty>
    <UiEmpty v-else-if="credentials.rows.length === 0" class="border border-dashed">
      <UiEmptyHeader><UiEmptyTitle>Учётных данных пока нет</UiEmptyTitle><UiEmptyDescription>Добавьте первую связку логина, пароля и дополнительных полей.</UiEmptyDescription></UiEmptyHeader>
      <UiEmptyContent v-if="state.canCreateCredentials"><UiButton @click="openCredentialCreate"><Plus data-icon="inline-start" />Новая учётная запись</UiButton></UiEmptyContent>
    </UiEmpty>
    <template v-else>
      <div class="flex flex-col gap-2 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <UiInput v-model="search" class="pl-9" placeholder="Поиск по названию или категории" />
        </div>
        <UiSelect v-model="selectedCategoryId">
          <UiSelectTrigger class="w-full sm:w-64"><UiSelectValue placeholder="Все категории" /></UiSelectTrigger>
          <UiSelectContent>
            <UiSelectGroup>
              <UiSelectItem value="all">Все категории</UiSelectItem>
              <UiSelectItem v-for="category in state.categories" :key="category.id" :value="category.id">{{ category.name }}</UiSelectItem>
            </UiSelectGroup>
          </UiSelectContent>
        </UiSelect>
      </div>
      <CredentialsTable v-if="visibleRows.length" :rows="visibleRows" @edit="credentials.openEdit" @delete="requestDelete" />
      <UiEmpty v-else class="border border-dashed">
        <UiEmptyHeader><UiEmptyTitle>Ничего не найдено</UiEmptyTitle><UiEmptyDescription>Измените строку поиска или фильтр категории.</UiEmptyDescription></UiEmptyHeader>
      </UiEmpty>
    </template>

    <CategoryManagementSheet v-if="state.canManage || state.canCreateCategories" v-model:open="managementOpen" @archived="loadCredentials" />
    <CredentialEditorSheet />
    <UiAlertDialog :open="deleteTarget !== null" @update:open="updateDeleteOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Удалить учётные данные?</UiAlertDialogTitle>
          <UiAlertDialogDescription>Вы точно хотите удалить «{{ deleteTarget?.title }}»? Запись будет перемещена в архив.</UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel :disabled="deleteTarget ? actions.isPendingFor(CREDENTIAL_ACTION.ARCHIVE, deleteTarget.id) : false">Отмена</UiAlertDialogCancel>
          <UiAlertDialogAction :disabled="deleteTarget ? actions.isPendingFor(CREDENTIAL_ACTION.ARCHIVE, deleteTarget.id) : false" @click="confirmDelete">
            <UiSpinner v-if="deleteTarget && actions.isPendingFor(CREDENTIAL_ACTION.ARCHIVE, deleteTarget.id)" data-icon="inline-start" />Удалить
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>

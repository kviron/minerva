<script setup lang="ts">
import { FolderKey, Plus, Search } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import type { MaskedCredentialListItem } from '../../../../shared/credentials/contracts'
import { CREDENTIAL_ACTION } from '../model/actions/actions'
import { CREDENTIAL_CATEGORY_ACTION } from '../model/actions/category-actions'
import { useCredentialCategoryActions, useCredentialsActions } from '../model/actions/provider'
import { useCategoryManagementStore } from '../model/category-management-state'
import { useCredentialsStore } from '../model/credentials-state'
import { CREDENTIALS_TAB, CREDENTIALS_TABS, type CredentialsTab } from '../model/credentials-tabs'
import CategoryManagementSheet from './CategoryManagementSheet.vue'
import CredentialCategoriesTable from './CredentialCategoriesTable.vue'
import CredentialEditorSheet from './CredentialEditorSheet.vue'
import CredentialsArchiveTable from './CredentialsArchiveTable.vue'
import CredentialsTable from './CredentialsTable.vue'

const actions = useCredentialsActions()
const categoryActions = useCredentialCategoryActions()
const state = useCategoryManagementStore()
const credentials = useCredentialsStore()
const activeTab = ref<CredentialsTab>(CREDENTIALS_TAB.DATA)
const managementOpen = ref(false)
const deleteTarget = ref<MaskedCredentialListItem | null>(null)
const search = ref('')
const selectedCategoryId = ref('all')
const initialLoaded = ref(false)

const visibleRows = computed(() => credentials.rows.filter(row => selectedCategoryId.value === 'all' || row.category.id === selectedCategoryId.value))
const loading = computed(() => !initialLoaded.value && (categoryActions.isPendingFor(CREDENTIAL_CATEGORY_ACTION.LOAD)
  || actions.isPendingFor(CREDENTIAL_ACTION.LOAD)
  || actions.isPendingFor(CREDENTIAL_ACTION.LOAD_ARCHIVE)))

const openCategoryCreate = () => {
  state.select(null)
  managementOpen.value = true
}
const openCategory = (categoryId: string) => {
  state.select(categoryId)
  managementOpen.value = true
}
const openCredentialCreate = () => {
  const category = state.categories[0]
  if (category) credentials.openCreate(category.id)
}
const loadCredentials = async (query = search.value) => {
  const rows = await actions.load(query)
  if (rows) credentials.applyRows(rows)
}
const loadArchivedCredentials = async () => {
  const rows = await actions.loadArchive()
  if (rows) credentials.applyArchivedRows(rows)
}
const loadCategories = async () => {
  const management = await categoryActions.load()
  if (management) state.apply(management)
}
const reload = async () => {
  await Promise.all([loadCategories(), loadCredentials(), loadArchivedCredentials()])
  initialLoaded.value = true
}
const handleCategoryArchived = () => Promise.all([loadCredentials(), loadArchivedCredentials()])
const requestDelete = (row: MaskedCredentialListItem) => { deleteTarget.value = row }
const updateDeleteOpen = (open: boolean) => {
  if (!open) deleteTarget.value = null
}
const confirmDelete = async () => {
  if (!deleteTarget.value) return

  const credentialId = deleteTarget.value.id
  const rows = await actions.archive(credentialId)
  if (!rows) return

  credentials.clearRevealedPassword(credentialId)
  credentials.applyRows(rows)
  await Promise.all([loadCredentials(), loadArchivedCredentials()])
  deleteTarget.value = null
}

watchDebounced(search, loadCredentials, { debounce: 350, maxWait: 800 })
onMounted(reload)
</script>

<template>
  <div class="flex flex-col gap-4 px-4 lg:px-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold">Учётные данные</h1>
        <p class="text-sm text-muted-foreground">Защищённые логины, пароли и дополнительные поля проекта.</p>
      </div>
      <UiButton v-if="activeTab === CREDENTIALS_TAB.DATA && state.canCreateCredentials && state.categories.length" @click="openCredentialCreate">
        <Plus data-icon="inline-start" />Новая учётная запись
      </UiButton>
    </div>

    <UiTabs v-model="activeTab" class="flex flex-col gap-4">
      <UiTabsList>
        <UiTabsTrigger v-for="tab in CREDENTIALS_TABS" :key="tab.value" :value="tab.value">{{ tab.label }}</UiTabsTrigger>
      </UiTabsList>

      <div v-if="loading" class="flex flex-col gap-3">
        <UiSkeleton class="h-10 w-full" />
        <UiSkeleton class="h-48 w-full" />
      </div>
      <UiAlert v-else-if="categoryActions.error.value || actions.error.value" variant="destructive">
        <UiAlertTitle>Не удалось загрузить учётные данные</UiAlertTitle>
        <UiAlertDescription>{{ categoryActions.error.value || actions.error.value }}</UiAlertDescription>
        <UiAlertAction><UiButton size="sm" variant="outline" @click="reload">Повторить</UiButton></UiAlertAction>
      </UiAlert>

      <template v-else>
        <UiTabsContent :value="CREDENTIALS_TAB.DATA" class="mt-0 flex flex-col gap-4">
          <UiEmpty v-if="state.categories.length === 0" class="border border-dashed">
            <UiEmptyHeader>
              <UiEmptyMedia variant="icon"><FolderKey /></UiEmptyMedia>
              <UiEmptyTitle>Категорий пока нет</UiEmptyTitle>
              <UiEmptyDescription>Создайте первую категорию, чтобы добавить и безопасно распределить учётные данные.</UiEmptyDescription>
            </UiEmptyHeader>
            <UiEmptyContent v-if="state.canCreateCategories"><UiButton @click="openCategoryCreate"><Plus data-icon="inline-start" />Создать категорию</UiButton></UiEmptyContent>
          </UiEmpty>
          <template v-else>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div class="relative w-full sm:w-96 sm:flex-none">
                <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <UiInput v-model="search" class="pl-9" placeholder="Поиск по названию, логину или дополнительным полям" />
              </div>
              <UiSelect v-model="selectedCategoryId">
                <UiSelectTrigger class="w-full sm:w-64" aria-label="Фильтр по категории"><UiSelectValue placeholder="Все категории" /></UiSelectTrigger>
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
              <UiEmptyHeader>
                <UiEmptyTitle>{{ search.trim() || selectedCategoryId !== 'all' ? 'Ничего не найдено' : 'Учётных данных пока нет' }}</UiEmptyTitle>
                <UiEmptyDescription>{{ search.trim() || selectedCategoryId !== 'all' ? 'Измените строку поиска или фильтр категории.' : 'Добавьте первую связку логина, пароля и дополнительных полей.' }}</UiEmptyDescription>
              </UiEmptyHeader>
              <UiEmptyContent v-if="!search.trim() && selectedCategoryId === 'all' && state.canCreateCredentials"><UiButton @click="openCredentialCreate"><Plus data-icon="inline-start" />Новая учётная запись</UiButton></UiEmptyContent>
            </UiEmpty>
          </template>
        </UiTabsContent>

        <UiTabsContent :value="CREDENTIALS_TAB.CATEGORIES" class="mt-0">
          <CredentialCategoriesTable
            :categories="state.categories"
            :can-create="state.canCreateCategories"
            :can-manage="state.canManage"
            @create="openCategoryCreate"
            @edit="openCategory"
          />
        </UiTabsContent>

        <UiTabsContent :value="CREDENTIALS_TAB.ARCHIVE" class="mt-0">
          <CredentialsArchiveTable :rows="credentials.archivedRows" />
        </UiTabsContent>
      </template>
    </UiTabs>

    <CategoryManagementSheet v-if="state.canManage || state.canCreateCategories" v-model:open="managementOpen" @archived="handleCategoryArchived" />
    <CredentialEditorSheet @saved="loadCredentials" />
    <UiAlertDialog :open="deleteTarget !== null" @update:open="updateDeleteOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Удалить учётные данные?</UiAlertDialogTitle>
          <UiAlertDialogDescription>Вы точно хотите удалить «{{ deleteTarget?.title }}»? Запись будет перемещена в архив.</UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel :disabled="deleteTarget ? actions.isPendingFor(CREDENTIAL_ACTION.ARCHIVE, deleteTarget.id) : false">Отмена</UiAlertDialogCancel>
          <UiButton variant="destructive" :disabled="deleteTarget ? actions.isPendingFor(CREDENTIAL_ACTION.ARCHIVE, deleteTarget.id) : false" @click="confirmDelete">
            <UiSpinner v-if="deleteTarget && actions.isPendingFor(CREDENTIAL_ACTION.ARCHIVE, deleteTarget.id)" data-icon="inline-start" />Удалить
          </UiButton>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>

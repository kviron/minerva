<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DOCUMENT_TEMPLATE,
  SYSTEM_DOCUMENT_TEMPLATES,
  type DocumentTemplate,
} from '../../../../shared/documents/constants'
import type {
  CreateDocumentRequest,
  DocumentRelationItem,
  RootDocumentListItem,
} from '../../../../shared/documents/contracts'

const ROOT_PARENT = 'root'
const props = defineProps<{
  open: boolean
  roots: readonly RootDocumentListItem[]
  fixedParent?: DocumentRelationItem
  pending?: boolean
  submitError?: string
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'create': [value: CreateDocumentRequest]
}>()

const title = ref('')
const parent = ref(ROOT_PARENT)
const template = ref<DocumentTemplate>(DOCUMENT_TEMPLATE.BLANK)
const titleError = ref('')
const selectedTemplate = computed(() => SYSTEM_DOCUMENT_TEMPLATES.find(item => item.value === template.value))

watch(() => props.open, (open) => {
  title.value = ''
  parent.value = open ? props.fixedParent?.id ?? ROOT_PARENT : ROOT_PARENT
  template.value = DOCUMENT_TEMPLATE.BLANK
  titleError.value = ''
})

const submit = () => {
  if (props.pending) {
    return
  }

  const normalizedTitle = title.value.trim()
  titleError.value = normalizedTitle.length === 0
    ? 'Укажите название страницы.'
    : normalizedTitle.length > 200 ? 'Название должно быть не длиннее 200 символов.' : ''
  if (titleError.value) {
    return
  }

  emit('create', {
    title: normalizedTitle,
    parentId: parent.value === ROOT_PARENT ? null : parent.value,
    template: template.value,
  })
}
</script>

<template>
  <UiDialog :open="open" @update:open="$emit('update:open', $event)">
    <UiDialogContent>
      <UiDialogHeader>
        <UiDialogTitle>Создать страницу</UiDialogTitle>
        <UiDialogDescription>
          Выберите расположение и шаблон. Новая страница сохранится как черновик.
        </UiDialogDescription>
      </UiDialogHeader>

      <form class="flex flex-col gap-6" @submit.prevent="submit">
        <UiFieldGroup>
          <UiField :data-invalid="titleError ? true : undefined">
            <UiFieldLabel for="document-title">Название</UiFieldLabel>
            <UiInput
              id="document-title"
              v-model="title"
              maxlength="200"
              autofocus
              :aria-invalid="Boolean(titleError)"
              placeholder="Например, Архитектура проекта"
            />
            <UiFieldError v-if="titleError" :errors="[titleError]" />
          </UiField>

          <UiField v-if="fixedParent" data-disabled>
            <UiFieldLabel for="document-fixed-parent">Родительская страница</UiFieldLabel>
            <UiInput id="document-fixed-parent" :model-value="fixedParent.title" disabled />
            <UiFieldDescription>Новая страница будет создана внутри выбранного документа.</UiFieldDescription>
          </UiField>

          <UiField v-else>
            <UiFieldLabel for="document-parent">Расположение</UiFieldLabel>
            <UiSelect v-model="parent">
              <UiSelectTrigger id="document-parent">
                <UiSelectValue placeholder="Выберите расположение" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectGroup>
                  <UiSelectItem :value="ROOT_PARENT">Корневой раздел</UiSelectItem>
                  <UiSelectItem v-for="root in roots" :key="root.id" :value="root.id">
                    {{ root.title }}
                  </UiSelectItem>
                </UiSelectGroup>
              </UiSelectContent>
            </UiSelect>
            <UiFieldDescription>Корневые страницы отображаются как основные разделы документации.</UiFieldDescription>
          </UiField>

          <UiField>
            <UiFieldLabel for="document-template">Шаблон</UiFieldLabel>
            <UiSelect v-model="template">
              <UiSelectTrigger id="document-template">
                <UiSelectValue placeholder="Выберите шаблон" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectGroup>
                  <UiSelectItem
                    v-for="item in SYSTEM_DOCUMENT_TEMPLATES"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </UiSelectItem>
                </UiSelectGroup>
              </UiSelectContent>
            </UiSelect>
            <UiFieldDescription>{{ selectedTemplate?.description }}</UiFieldDescription>
          </UiField>

          <UiFieldError v-if="submitError" :errors="[submitError]" />
        </UiFieldGroup>

        <UiDialogFooter>
          <UiButton type="button" variant="outline" :disabled="pending" @click="$emit('update:open', false)">
            Отмена
          </UiButton>
          <UiButton type="submit" :disabled="pending">
            <UiSpinner v-if="pending" data-icon="inline-start" />
            {{ pending ? 'Создаём…' : 'Создать' }}
          </UiButton>
        </UiDialogFooter>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>

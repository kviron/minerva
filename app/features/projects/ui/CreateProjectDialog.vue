<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from '../../../../shared/projects/constants'

const props = defineProps<{ open: boolean, pending?: boolean, submitError?: string }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'create': [value: { name: string, description: string | null }]
}>()

const name = ref('')
const description = ref('')
const nameError = ref('')
const descriptionError = ref('')
const invalid = computed(() => Boolean(nameError.value || descriptionError.value || props.submitError))

watch(() => props.open, (open) => {
  if (!open) {
    name.value = ''
    description.value = ''
    nameError.value = ''
    descriptionError.value = ''
  }
})

const submit = async () => {
  if (props.pending) return
  const normalizedName = name.value.trim()
  const normalizedDescription = description.value.trim()
  nameError.value = normalizedName.length === 0 ? 'Укажите название проекта.'
    : normalizedName.length > PROJECT_NAME_MAX_LENGTH ? 'Название должно быть не длиннее 120 символов.' : ''
  descriptionError.value = normalizedDescription.length > PROJECT_DESCRIPTION_MAX_LENGTH
    ? 'Описание должно быть не длиннее 2000 символов.' : ''
  if (nameError.value || descriptionError.value) return

  emit('create', { name: normalizedName, description: normalizedDescription || null })
}
</script>

<template>
  <UiDialog :open="open" @update:open="$emit('update:open', $event)">
    <UiDialogContent>
      <UiDialogHeader>
        <UiDialogTitle>Создать проект</UiDialogTitle>
        <UiDialogDescription>
          Укажите название и добавьте описание, если оно нужно.
        </UiDialogDescription>
      </UiDialogHeader>
      <form class="flex flex-col gap-6" @submit.prevent="submit">
        <UiFieldGroup>
          <UiField :data-invalid="nameError ? true : undefined">
            <UiFieldLabel for="project-name">Название</UiFieldLabel>
            <UiInput id="project-name" v-model="name" :aria-invalid="Boolean(nameError)" :maxlength="PROJECT_NAME_MAX_LENGTH" autofocus />
            <UiFieldError v-if="nameError" :errors="[nameError]" />
          </UiField>
          <UiField :data-invalid="descriptionError ? true : undefined">
            <UiFieldLabel for="project-description">Описание</UiFieldLabel>
            <UiTextarea id="project-description" v-model="description" :aria-invalid="Boolean(descriptionError)" :maxlength="PROJECT_DESCRIPTION_MAX_LENGTH" />
            <UiFieldError v-if="descriptionError" :errors="[descriptionError]" />
          </UiField>
          <UiFieldError v-if="invalid && submitError" :errors="[submitError]" />
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

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RichTextEditor } from '@/features/documents'
import type { DocumentContent } from '../../../../shared/documents/contracts'
import { projectsApi } from '../api/projects-api'
import { useProjectOverviewStore } from '../model/project-overview-state'

const props = defineProps<{ projectId: string, descriptionContent: DocumentContent }>()
const emit = defineEmits<{ updated: [description: string | null, content: DocumentContent] }>()
const projectOverview = useProjectOverviewStore()
const content = ref<DocumentContent>(props.descriptionContent)
const saved = ref(JSON.stringify(props.descriptionContent))
const pending = ref(false)
const error = ref<string | null>(null)
const dirty = computed(() => JSON.stringify(content.value) !== saved.value)

watch(() => props.descriptionContent, (value) => {
  content.value = value
  saved.value = JSON.stringify(value)
}, { deep: true })

const save = async (): Promise<void> => {
  pending.value = true
  error.value = null
  try {
    const result = await projectsApi.updateDescription(props.projectId, { content: content.value })
    content.value = result.descriptionContent
    saved.value = JSON.stringify(result.descriptionContent)
    if (projectOverview.project?.id === props.projectId) {
      projectOverview.applyProject({ ...projectOverview.project, ...result })
    }
    emit('updated', result.description, result.descriptionContent)
  }
  catch {
    error.value = 'Не удалось сохранить описание проекта.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Описание проекта</UiCardTitle>
      <UiCardDescription>Кратко опишите назначение проекта. Описание отображается в списке проектов.</UiCardDescription>
    </UiCardHeader>
    <UiCardContent class="flex flex-col gap-4">
      <RichTextEditor v-model="content" :disabled="pending" aria-label="Описание проекта" />
      <UiAlert v-if="error" variant="destructive">
        <UiAlertTitle>Не удалось сохранить описание</UiAlertTitle>
        <UiAlertDescription>{{ error }}</UiAlertDescription>
      </UiAlert>
    </UiCardContent>
    <UiCardFooter class="justify-end">
      <UiButton :disabled="!dirty || pending" @click="save">
        <UiSpinner v-if="pending" data-icon="inline-start" />
        Сохранить
      </UiButton>
    </UiCardFooter>
  </UiCard>
</template>

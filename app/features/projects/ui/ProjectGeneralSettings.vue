<script setup lang="ts">
import { ImagePlus, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { RichTextEditor } from '@/features/documents'
import { PROJECT_ICON_MAX_BYTES, PROJECT_ICON_MIME_TYPE } from '../../../../shared/projects/constants'
import type { DocumentContent } from '../../../../shared/documents/contracts'
import { PROJECT_ACTION, ProjectsActions } from '../model/actions/actions'
import { useProjectOverviewStore } from '../model/project-overview-state'
import { projectIconUrl, projectInitials } from '../model/project-icon'

const props = defineProps<{
  projectId: string
  projectName: string
  descriptionContent: DocumentContent
  iconId: string | null
}>()

const actions = new ProjectsActions()
const projectOverview = useProjectOverviewStore()
const content = ref<DocumentContent>(props.descriptionContent)
const savedContent = ref(JSON.stringify(props.descriptionContent))
const selectedFile = ref<File | null>(null)
const removeIcon = ref(false)
const localError = ref<string | null>(null)
const input = ref<HTMLInputElement | null>(null)

const pending = computed(() => actions.isPendingFor(PROJECT_ACTION.SAVE_GENERAL_SETTINGS, props.projectId))
const dirty = computed(() => JSON.stringify(content.value) !== savedContent.value || selectedFile.value !== null || removeIcon.value)
const error = computed(() => localError.value ?? actions.error.value)
const currentIconId = computed(() => removeIcon.value ? null : props.iconId)
const imageUrl = computed(() => currentIconId.value === null ? null : projectIconUrl(props.projectId, currentIconId.value))

watch(() => props.descriptionContent, value => {
  content.value = value
  savedContent.value = JSON.stringify(value)
}, { deep: true })
watch(() => props.iconId, () => { removeIcon.value = false })

const selectFile = (event: Event): void => {
  localError.value = null
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const file = target.files?.[0] ?? null
  const allowed = Object.values(PROJECT_ICON_MIME_TYPE).some(mimeType => mimeType === file?.type)
  if (file && (!allowed || file.size === 0 || file.size > PROJECT_ICON_MAX_BYTES)) {
    selectedFile.value = null
    localError.value = 'Выберите PNG, JPEG или WebP размером не более 2 МиБ.'
    target.value = ''
    return
  }
  selectedFile.value = file
  removeIcon.value = false
}

const clearIconChange = (): void => {
  selectedFile.value = null
  removeIcon.value = props.iconId !== null
  if (input.value) input.value.value = ''
}

const save = async (): Promise<void> => {
  const result = await actions.saveGeneralSettings(props.projectId, {
    content: content.value,
    iconFile: selectedFile.value,
    removeIcon: removeIcon.value,
  })
  if (!result) return
  content.value = result.description.descriptionContent
  savedContent.value = JSON.stringify(result.description.descriptionContent)
  selectedFile.value = null
  removeIcon.value = false
  if (input.value) input.value.value = ''
  if (projectOverview.project?.id === props.projectId) {
    projectOverview.applyProject({
      ...projectOverview.project,
      ...result.description,
      ...(result.icon ? { iconId: result.icon.iconId } : {}),
    })
  }
}
</script>

<template>
  <UiFieldGroup>
    <UiField>
      <UiFieldLabel for="project-icon">Иконка проекта</UiFieldLabel>
      <div class="flex items-center gap-4">
        <UiAvatar class="size-16 rounded-lg">
          <UiAvatarImage v-if="imageUrl" :src="imageUrl" :alt="`Иконка проекта ${projectName}`" />
          <UiAvatarFallback class="rounded-lg">{{ projectInitials(projectName) }}</UiAvatarFallback>
        </UiAvatar>
        <UiInput id="project-icon" ref="input" type="file" accept="image/png,image/jpeg,image/webp" :disabled="pending"
          @change="selectFile" />
      </div>
      <UiFieldDescription>PNG, JPEG или WebP, не более 2 МиБ.</UiFieldDescription>
      <UiButton v-if="props.iconId || selectedFile" type="button" variant="outline" size="sm" :disabled="pending"
        @click="clearIconChange">
        <X data-icon="inline-start" /> Убрать иконку
      </UiButton>
    </UiField>
    <UiField>
      <UiFieldLabel>Описание проекта</UiFieldLabel>
      <RichTextEditor v-model="content" :disabled="pending" aria-label="Описание проекта" />
    </UiField>

  </UiFieldGroup>
  <UiAlert v-if="error" variant="destructive">
    <UiAlertTitle>Не удалось сохранить настройки</UiAlertTitle>
    <UiAlertDescription>{{ error }}</UiAlertDescription>
  </UiAlert>
  <UiButton :disabled="!dirty || pending" @click="save">
    <UiSpinner v-if="pending" data-icon="inline-start" />
    <ImagePlus v-else data-icon="inline-start" />
    Сохранить изменения
  </UiButton>
</template>

<script setup lang="ts">
import { ImageUp, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { PROJECT_ICON_MAX_BYTES, PROJECT_ICON_MIME_TYPE } from '../../../../shared/projects/constants'
import { PROJECT_ICON_ACTION, ProjectIconActions } from '../model/actions/project-icon-actions'
import { projectIconUrl, projectInitials } from '../model/project-icon'

const props = defineProps<{
  projectId: string
  projectName: string
  iconId: string | null
}>()

const emit = defineEmits<{ updated: [iconId: string | null] }>()
const actions = new ProjectIconActions(props.projectId)
const currentIconId = ref<string | null>(props.iconId)
const selectedFile = ref<File | null>(null)
const localError = ref<string | null>(null)
const removeOpen = ref(false)
const input = ref<HTMLInputElement | null>(null)

const pendingUpload = computed(() => actions.isPendingFor(PROJECT_ICON_ACTION.UPLOAD))
const pendingRemove = computed(() => actions.isPendingFor(PROJECT_ICON_ACTION.REMOVE))
const error = computed(() => localError.value ?? actions.error.value)
const imageUrl = computed(() => currentIconId.value === null
  ? null
  : projectIconUrl(props.projectId, currentIconId.value))

watch(() => props.iconId, value => { currentIconId.value = value })

const selectFile = (event: Event) => {
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
}

const upload = async () => {
  if (!selectedFile.value) return
  localError.value = null
  const result = await actions.upload(selectedFile.value)
  if (!result) return
  currentIconId.value = result.iconId
  selectedFile.value = null
  if (input.value) input.value.value = ''
  emit('updated', result.iconId)
}

const remove = async () => {
  localError.value = null
  const result = await actions.remove()
  if (!result) return
  currentIconId.value = result.iconId
  removeOpen.value = false
  emit('updated', result.iconId)
}
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Иконка проекта</UiCardTitle>
      <UiCardDescription>Отображается рядом с названием проекта в общем списке.</UiCardDescription>
    </UiCardHeader>
    <UiCardContent class="flex flex-col gap-4">
      <div class="flex items-center gap-4">
        <UiAvatar class="size-16 rounded-lg">
          <UiAvatarImage v-if="imageUrl" :src="imageUrl" :alt="`Иконка проекта ${projectName}`" />
          <UiAvatarFallback class="rounded-lg">{{ projectInitials(projectName) }}</UiAvatarFallback>
        </UiAvatar>
        <UiFieldGroup class="flex-1">
          <UiField>
            <UiFieldLabel for="project-icon">Файл иконки</UiFieldLabel>
            <UiInput
              id="project-icon"
              ref="input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              :disabled="pendingUpload || pendingRemove"
              @change="selectFile"
            />
            <UiFieldDescription>PNG, JPEG или WebP, не более 2 МиБ.</UiFieldDescription>
          </UiField>
        </UiFieldGroup>
      </div>
      <UiAlert v-if="error" variant="destructive">
        <UiAlertTitle>Не удалось изменить иконку</UiAlertTitle>
        <UiAlertDescription>{{ error }}</UiAlertDescription>
      </UiAlert>
    </UiCardContent>
    <UiCardFooter class="flex justify-between gap-3">
      <UiButton variant="outline" :disabled="currentIconId === null || pendingUpload || pendingRemove" @click="removeOpen = true">
        <Trash2 data-icon="inline-start" />Удалить
      </UiButton>
      <UiButton :disabled="selectedFile === null || pendingUpload || pendingRemove" @click="upload">
        <UiSpinner v-if="pendingUpload" data-icon="inline-start" />
        <ImageUp v-else data-icon="inline-start" />
        Загрузить
      </UiButton>
    </UiCardFooter>

    <UiAlertDialog v-model:open="removeOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Удалить иконку проекта?</UiAlertDialogTitle>
          <UiAlertDialogDescription>В списке проектов снова будут показаны инициалы названия.</UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel :disabled="pendingRemove">Отмена</UiAlertDialogCancel>
          <UiButton variant="destructive" :disabled="pendingRemove" @click="remove">
            <UiSpinner v-if="pendingRemove" data-icon="inline-start" />Удалить
          </UiButton>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </UiCard>
</template>

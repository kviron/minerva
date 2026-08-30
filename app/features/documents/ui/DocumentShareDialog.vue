<script setup lang="ts">
import { Copy, ExternalLink, Link2, RefreshCw, ShieldOff } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import type { DocumentPublicShareProjection } from '../../../../shared/documents/public-share-contracts'
import {
  DOCUMENT_PUBLIC_SHARE_SCOPE,
  DOCUMENT_PUBLIC_SHARE_STATUS,
} from '../../../../shared/documents/public-share-constants'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'

type ShareScope = typeof DOCUMENT_PUBLIC_SHARE_SCOPE[keyof typeof DOCUMENT_PUBLIC_SHARE_SCOPE]
type Confirmation = 'rotate' | 'revoke' | null

const props = defineProps<{
  open: boolean
  projectId: string
  documentId: string
  hasPublishedVersion: boolean
}>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
const actions = useDocumentsActions()
const selectedScope = ref<ShareScope>(DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT)
const shares = ref<readonly DocumentPublicShareProjection[]>([])
const revealedUrl = ref<string | null>(null)
const loadError = ref<string | null>(null)
const mutationError = ref<string | null>(null)
const confirmation = ref<Confirmation>(null)
const actionId = computed(() => `${props.projectId}:${props.documentId}`)
const selectedShare = computed(() => shares.value.find(share => share.scope === selectedScope.value) ?? null)
const activeShare = computed(() => selectedShare.value?.status === DOCUMENT_PUBLIC_SHARE_STATUS.ACTIVE
  ? selectedShare.value
  : null)
const loading = computed(() => actions.isPendingFor(DOCUMENT_ACTION.SHARE_LIST, actionId.value))
const mutating = computed(() => [
  DOCUMENT_ACTION.SHARE_OPEN,
  DOCUMENT_ACTION.SHARE_COPY,
  DOCUMENT_ACTION.SHARE_ROTATE,
  DOCUMENT_ACTION.SHARE_REVOKE,
].some(action => actions.isPendingFor(action, actionId.value)))

const applyShare = (share: DocumentPublicShareProjection): void => {
  shares.value = [share, ...shares.value.filter(current => current.scope !== share.scope)]
}

const load = async (): Promise<void> => {
  revealedUrl.value = null
  loadError.value = null
  mutationError.value = null
  if (!props.hasPublishedVersion) return
  const result = await actions.listShares(props.projectId, props.documentId)
  if (!result) {
    loadError.value = actions.error.value ?? 'Не удалось загрузить настройки публичного доступа.'
    return
  }
  shares.value = result.shares
}

watch(() => props.open, (open) => {
  if (open) void load()
  else {
    revealedUrl.value = null
    mutationError.value = null
    confirmation.value = null
  }
})
watch(selectedScope, () => {
  revealedUrl.value = null
  mutationError.value = null
  confirmation.value = null
})

const openAccess = async (): Promise<void> => {
  mutationError.value = null
  const result = await actions.openShare(props.projectId, props.documentId, { scope: selectedScope.value })
  if (!result) {
    mutationError.value = actions.error.value ?? 'Не удалось открыть публичный доступ.'
    return
  }
  applyShare(result.share)
  revealedUrl.value = result.url
}

const revealAndCopy = async (): Promise<void> => {
  const share = activeShare.value
  if (!share) return
  mutationError.value = null
  const result = await actions.copyShare(props.projectId, props.documentId, share.id)
  if (!result) {
    mutationError.value = actions.error.value ?? 'Не удалось получить публичную ссылку.'
    return
  }
  revealedUrl.value = result.url
  try {
    await navigator.clipboard.writeText(result.url)
    toast.success('Ссылка скопирована')
  }
  catch {
    toast.error('Не удалось скопировать ссылку')
  }
}

const rotate = async (): Promise<void> => {
  const share = activeShare.value
  if (!share) return
  mutationError.value = null
  const result = await actions.rotateShare(props.projectId, props.documentId, share.id)
  if (!result) {
    mutationError.value = actions.error.value ?? 'Не удалось обновить публичную ссылку.'
    return
  }
  applyShare(result.share)
  revealedUrl.value = result.url
  confirmation.value = null
  toast.success('Публичная ссылка обновлена')
}

const revoke = async (): Promise<void> => {
  const share = activeShare.value
  if (!share) return
  mutationError.value = null
  const result = await actions.revokeShare(props.projectId, props.documentId, share.id)
  if (!result) {
    mutationError.value = actions.error.value ?? 'Не удалось закрыть публичный доступ.'
    return
  }
  applyShare(result)
  revealedUrl.value = null
  confirmation.value = null
  toast.success('Публичный доступ закрыт')
}

const openRevealedUrl = (): void => {
  if (revealedUrl.value) window.open(revealedUrl.value, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-xl">
      <UiDialogHeader>
        <UiDialogTitle>Поделиться документацией</UiDialogTitle>
        <UiDialogDescription>
          Откройте чтение опубликованной версии по ссылке без авторизации.
        </UiDialogDescription>
      </UiDialogHeader>

      <UiAlert v-if="!hasPublishedVersion">
        <Link2 />
        <UiAlertTitle>Сначала опубликуйте страницу</UiAlertTitle>
        <UiAlertDescription>Черновики нельзя открывать по публичной ссылке.</UiAlertDescription>
      </UiAlert>

      <template v-else>
        <UiAlert>
          <Link2 />
          <UiAlertTitle>Гости видят только опубликованное</UiAlertTitle>
          <UiAlertDescription>
            Новые изменения черновика появятся по ссылке только после следующей публикации.
          </UiAlertDescription>
        </UiAlert>

        <UiFieldSet>
          <UiFieldLegend>Область доступа</UiFieldLegend>
          <UiRadioGroup v-model="selectedScope">
            <UiField orientation="horizontal">
              <UiRadioGroupItem id="share-scope-document" :value="DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT" />
              <UiFieldLabel for="share-scope-document">Только эта страница</UiFieldLabel>
            </UiField>
            <UiField orientation="horizontal">
              <UiRadioGroupItem id="share-scope-branch" :value="DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH" />
              <UiFieldLabel for="share-scope-branch">Вся ветка документации</UiFieldLabel>
            </UiField>
          </UiRadioGroup>
        </UiFieldSet>

        <UiAlert v-if="selectedScope === DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH">
          <UiAlertTitle>Динамическая ветка</UiAlertTitle>
          <UiAlertDescription>
            Будущие опубликованные дочерние страницы также станут доступны по этой ссылке.
          </UiAlertDescription>
        </UiAlert>

        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">Публичный доступ</span>
            <UiBadge :variant="activeShare ? 'default' : 'secondary'">
              {{ activeShare ? 'Открыт' : 'Закрыт' }}
            </UiBadge>
          </div>
          <UiSpinner v-if="loading" />
        </div>

        <UiAlert v-if="loadError" variant="destructive">
          <UiAlertTitle>Не удалось загрузить настройки</UiAlertTitle>
          <UiAlertDescription>{{ loadError }}</UiAlertDescription>
        </UiAlert>
        <UiAlert v-if="mutationError" variant="destructive">
          <UiAlertTitle>Операция не выполнена</UiAlertTitle>
          <UiAlertDescription>{{ mutationError }}</UiAlertDescription>
        </UiAlert>

        <UiField v-if="revealedUrl">
          <UiFieldLabel for="public-document-url">Публичная ссылка</UiFieldLabel>
          <UiInputGroup>
            <UiInputGroupInput id="public-document-url" :model-value="revealedUrl" readonly />
            <UiInputGroupAddon align="inline-end">
              <UiInputGroupButton aria-label="Открыть ссылку" title="Открыть ссылку" @click="openRevealedUrl">
                <ExternalLink />
              </UiInputGroupButton>
            </UiInputGroupAddon>
          </UiInputGroup>
        </UiField>

        <UiDialogFooter class="flex-wrap sm:justify-between">
          <div class="flex flex-wrap gap-2">
            <UiButton v-if="!activeShare" :disabled="mutating || loading" @click="openAccess">
              <UiSpinner v-if="mutating" data-icon="inline-start" />
              Открыть доступ
            </UiButton>
            <template v-else>
              <UiButton :disabled="mutating" @click="revealAndCopy">
                <Copy data-icon="inline-start" />
                Скопировать ссылку
              </UiButton>
              <UiButton variant="outline" :disabled="mutating" @click="confirmation = 'rotate'">
                <RefreshCw data-icon="inline-start" />
                Обновить ссылку
              </UiButton>
            </template>
          </div>
          <UiButton v-if="activeShare" variant="destructive" :disabled="mutating" @click="confirmation = 'revoke'">
            <ShieldOff data-icon="inline-start" />
            Закрыть доступ
          </UiButton>
        </UiDialogFooter>
      </template>
    </UiDialogContent>
  </UiDialog>

  <UiAlertDialog :open="confirmation !== null" @update:open="confirmation = $event ? confirmation : null">
    <UiAlertDialogContent>
      <UiAlertDialogHeader>
        <UiAlertDialogTitle>
          {{ confirmation === 'rotate' ? 'Обновить публичную ссылку?' : 'Закрыть публичный доступ?' }}
        </UiAlertDialogTitle>
        <UiAlertDialogDescription>
          Текущая ссылка сразу перестанет работать. Это действие нельзя отменить.
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>
      <UiAlertDialogFooter>
        <UiAlertDialogCancel :disabled="mutating">Отмена</UiAlertDialogCancel>
        <UiAlertDialogAction :disabled="mutating" @click="confirmation === 'rotate' ? rotate() : revoke()">
          <UiSpinner v-if="mutating" data-icon="inline-start" />
          {{ confirmation === 'rotate' ? 'Обновить ссылку' : 'Закрыть доступ' }}
        </UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>

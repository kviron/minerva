<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ADMINISTRATION_AUDIT_TARGET_STATE,
  type AdministrationAuditTargetResponse,
} from '../../../../shared/administration/contracts'
import { AdministrationAuditActions } from '../model/actions/audit-actions'

const props = defineProps<{
  open: boolean
  auditEventId: string | null
  targetLabel: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const actions = new AdministrationAuditActions()
const target = ref<AdministrationAuditTargetResponse | null>(null)
const pending = computed(() => actions.isPending.value)
const error = computed(() => actions.error.value ?? '')

const load = async (): Promise<void> => {
  const auditEventId = props.auditEventId
  target.value = null
  if (!props.open || auditEventId === null) return
  const response = await actions.getTarget(auditEventId)
  if (props.open && props.auditEventId === auditEventId && response !== undefined)
    target.value = response
}

watch(() => [props.open, props.auditEventId] as const, load, { immediate: true })
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-2xl">
      <UiDialogHeader>
        <UiDialogTitle>{{ target?.title ?? 'Текущее состояние объекта' }}</UiDialogTitle>
        <UiDialogDescription>
          {{ targetLabel }}. Показано текущее состояние — оно могло измениться после события аудита.
        </UiDialogDescription>
      </UiDialogHeader>

      <div v-if="pending" class="flex flex-col gap-2">
        <UiSkeleton class="h-8 w-2/3" />
        <UiSkeleton v-for="index in 4" :key="index" class="h-10 w-full" />
      </div>

      <UiAlert v-else-if="error" variant="destructive" role="alert">
        <UiAlertTitle>Не удалось открыть объект</UiAlertTitle>
        <UiAlertDescription>{{ error }}</UiAlertDescription>
      </UiAlert>

      <UiEmpty v-else-if="target && target.state !== ADMINISTRATION_AUDIT_TARGET_STATE.AVAILABLE">
        <UiEmptyHeader>
          <UiEmptyTitle>{{ target.title }}</UiEmptyTitle>
          <UiEmptyDescription>Тип объекта: {{ target.type }}</UiEmptyDescription>
        </UiEmptyHeader>
      </UiEmpty>

      <dl v-else-if="target" class="grid gap-4 sm:grid-cols-2">
        <div v-for="item in target.fields" :key="item.label" class="flex min-w-0 flex-col gap-1">
          <dt class="text-sm text-muted-foreground">{{ item.label }}</dt>
          <dd class="break-words font-medium">{{ item.value }}</dd>
        </div>
      </dl>
    </UiDialogContent>
  </UiDialog>
</template>


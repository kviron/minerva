<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import type { DocumentTreeNode, MoveDocumentRequest } from '../../../../shared/documents/contracts'

const ROOT_PARENT = 'root'
interface ParentOption {
  readonly id: string
  readonly label: string
}

const props = defineProps<{
  open: boolean
  document: DocumentTreeNode | null
  tree: readonly DocumentTreeNode[]
  pending?: boolean
  submitError?: string
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'move': [value: MoveDocumentRequest]
}>()

const targetParent = ref(ROOT_PARENT)
const targetPosition = ref('0')

const collectIds = (node: DocumentTreeNode): ReadonlySet<string> => {
  const ids = new Set<string>([node.id])
  for (const child of node.children) {
    for (const id of collectIds(child)) {
      ids.add(id)
    }
  }
  return ids
}

const flattenParents = (
  nodes: readonly DocumentTreeNode[],
  excludedIds: ReadonlySet<string>,
  depth = 0,
): readonly ParentOption[] => nodes.flatMap((node): readonly ParentOption[] => excludedIds.has(node.id)
  ? []
  : [
      { id: node.id, label: `${'— '.repeat(depth)}${node.title}` },
      ...flattenParents(node.children, excludedIds, depth + 1),
    ])

const findLocation = (
  nodes: readonly DocumentTreeNode[],
  documentId: string,
  parentId: string | null = null,
): { readonly parentId: string | null, readonly position: number } | null => {
  const position = nodes.findIndex(node => node.id === documentId)
  if (position >= 0) {
    return { parentId, position }
  }
  for (const node of nodes) {
    const location = findLocation(node.children, documentId, node.id)
    if (location) {
      return location
    }
  }
  return null
}

const findNode = (nodes: readonly DocumentTreeNode[], documentId: string): DocumentTreeNode | null => {
  for (const node of nodes) {
    if (node.id === documentId) {
      return node
    }
    const nested = findNode(node.children, documentId)
    if (nested) {
      return nested
    }
  }
  return null
}

const excludedIds = computed<ReadonlySet<string>>(() => props.document ? collectIds(props.document) : new Set())
const parentOptions = computed<readonly ParentOption[]>(() => [
  { id: ROOT_PARENT, label: 'Корневой раздел' },
  ...flattenParents(props.tree, excludedIds.value),
])
const targetParentId = computed(() => targetParent.value === ROOT_PARENT ? null : targetParent.value)
const targetSiblings = computed<readonly DocumentTreeNode[]>(() => {
  const siblings = targetParentId.value === null
    ? props.tree
    : findNode(props.tree, targetParentId.value)?.children ?? []
  return props.document ? siblings.filter(node => node.id !== props.document?.id) : siblings
})
const positionOptions = computed(() => [
  { value: '0', label: 'В начало' },
  ...targetSiblings.value.map((node, index) => ({ value: String(index + 1), label: `После «${node.title}»` })),
])

watch(() => [props.open, props.document?.id] as const, ([open]) => {
  if (!open || !props.document) {
    return
  }
  const location = findLocation(props.tree, props.document.id)
  targetParent.value = location?.parentId ?? ROOT_PARENT
  targetPosition.value = String(location?.position ?? 0)
}, { immediate: true })

const setTargetParent = (value: AcceptableValue): void => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return
  }
  targetParent.value = String(value)
  targetPosition.value = String(targetSiblings.value.length)
}

const submit = (): void => {
  if (props.pending || !props.document) {
    return
  }
  emit('move', {
    targetParentId: targetParentId.value,
    targetPosition: Number(targetPosition.value),
  })
}
</script>

<template>
  <UiDialog :open="open" @update:open="$emit('update:open', $event)">
    <UiDialogContent>
      <UiDialogHeader>
        <UiDialogTitle>Переместить страницу</UiDialogTitle>
        <UiDialogDescription v-if="document">
          Выберите новое расположение страницы «{{ document.title }}» и её место среди соседних страниц.
        </UiDialogDescription>
      </UiDialogHeader>

      <form class="flex flex-col gap-6" @submit.prevent="submit">
        <UiFieldGroup>
          <UiField>
            <UiFieldLabel for="move-document-parent">Расположение</UiFieldLabel>
            <UiSelect :model-value="targetParent" @update:model-value="setTargetParent">
              <UiSelectTrigger id="move-document-parent">
                <UiSelectValue placeholder="Выберите расположение" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectGroup>
                  <UiSelectItem v-for="option in parentOptions" :key="option.id" :value="option.id">
                    {{ option.label }}
                  </UiSelectItem>
                </UiSelectGroup>
              </UiSelectContent>
            </UiSelect>
          </UiField>

          <UiField>
            <UiFieldLabel for="move-document-position">Позиция</UiFieldLabel>
            <UiSelect v-model="targetPosition">
              <UiSelectTrigger id="move-document-position">
                <UiSelectValue placeholder="Выберите позицию" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectGroup>
                  <UiSelectItem v-for="option in positionOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </UiSelectItem>
                </UiSelectGroup>
              </UiSelectContent>
            </UiSelect>
          </UiField>

          <UiFieldError v-if="submitError" :errors="[submitError]" />
        </UiFieldGroup>

        <UiDialogFooter>
          <UiButton type="button" variant="outline" :disabled="pending" @click="$emit('update:open', false)">
            Отмена
          </UiButton>
          <UiButton type="submit" :disabled="pending">
            <UiSpinner v-if="pending" data-icon="inline-start" />
            Переместить
          </UiButton>
        </UiDialogFooter>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>

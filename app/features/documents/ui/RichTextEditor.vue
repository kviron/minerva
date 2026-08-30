<script setup lang="ts">
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, watch } from 'vue'
import type { DocumentContent } from '../../../../shared/documents/contracts'
import { parseEditorDocumentContent, toTiptapEditorContent } from '../model/editor-content'
import RichTextEditorToolbar from './RichTextEditorToolbar.vue'

const props = withDefaults(defineProps<{
  modelValue: DocumentContent
  disabled?: boolean
  ariaLabel?: string
}>(), { disabled: false, ariaLabel: 'Текстовый редактор' })

const emit = defineEmits<{ 'update:modelValue': [content: DocumentContent] }>()

const editor = useEditor({
  content: toTiptapEditorContent(props.modelValue),
  extensions: [StarterKit],
  editable: !props.disabled,
  editorProps: { attributes: { class: 'min-h-48 px-4 py-3 outline-none', 'aria-label': props.ariaLabel } },
  onUpdate: ({ editor: currentEditor }) => emit('update:modelValue', parseEditorDocumentContent(currentEditor.getJSON())),
})

watch(() => props.disabled, disabled => editor.value?.setEditable(!disabled))
watch(() => props.modelValue, (content) => {
  const current = editor.value
  if (!current || JSON.stringify(current.getJSON()) === JSON.stringify(content)) return
  current.commands.setContent(toTiptapEditorContent(content), { emitUpdate: false })
}, { deep: true })

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50">
    <RichTextEditorToolbar v-if="editor" :editor="editor" :disabled="disabled" />
    <EditorContent :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { Bold, Code2, Heading2, Italic, List, ListOrdered, Quote, Redo2, Strikethrough, Undo2 } from '@lucide/vue'
import type { Editor } from '@tiptap/vue-3'

defineProps<{ editor: Editor, disabled?: boolean }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 border-b p-2" role="toolbar" aria-label="Форматирование текста">
    <UiButton type="button" size="icon-sm" :disabled="disabled" :variant="editor.isActive('bold') ? 'secondary' : 'ghost'" aria-label="Полужирный" @click="editor.chain().focus().toggleBold().run()"><Bold /></UiButton>
    <UiButton type="button" size="icon-sm" :disabled="disabled" :variant="editor.isActive('italic') ? 'secondary' : 'ghost'" aria-label="Курсив" @click="editor.chain().focus().toggleItalic().run()"><Italic /></UiButton>
    <UiButton type="button" size="icon-sm" :disabled="disabled" :variant="editor.isActive('strike') ? 'secondary' : 'ghost'" aria-label="Зачёркнутый" @click="editor.chain().focus().toggleStrike().run()"><Strikethrough /></UiButton>
    <UiSeparator orientation="vertical" class="mx-1 h-5" />
    <UiButton type="button" size="icon-sm" :disabled="disabled" :variant="editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'" aria-label="Заголовок" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"><Heading2 /></UiButton>
    <UiButton type="button" size="icon-sm" :disabled="disabled" :variant="editor.isActive('bulletList') ? 'secondary' : 'ghost'" aria-label="Маркированный список" @click="editor.chain().focus().toggleBulletList().run()"><List /></UiButton>
    <UiButton type="button" size="icon-sm" :disabled="disabled" :variant="editor.isActive('orderedList') ? 'secondary' : 'ghost'" aria-label="Нумерованный список" @click="editor.chain().focus().toggleOrderedList().run()"><ListOrdered /></UiButton>
    <UiButton type="button" size="icon-sm" :disabled="disabled" :variant="editor.isActive('blockquote') ? 'secondary' : 'ghost'" aria-label="Цитата" @click="editor.chain().focus().toggleBlockquote().run()"><Quote /></UiButton>
    <UiButton type="button" size="icon-sm" :disabled="disabled" :variant="editor.isActive('codeBlock') ? 'secondary' : 'ghost'" aria-label="Блок кода" @click="editor.chain().focus().toggleCodeBlock().run()"><Code2 /></UiButton>
    <UiSeparator orientation="vertical" class="mx-1 h-5" />
    <UiButton type="button" size="icon-sm" variant="ghost" :disabled="disabled || !editor.can().undo()" aria-label="Отменить" @click="editor.chain().focus().undo().run()"><Undo2 /></UiButton>
    <UiButton type="button" size="icon-sm" variant="ghost" :disabled="disabled || !editor.can().redo()" aria-label="Повторить" @click="editor.chain().focus().redo().run()"><Redo2 /></UiButton>
  </div>
</template>

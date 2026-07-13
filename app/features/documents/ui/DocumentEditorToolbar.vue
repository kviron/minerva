<script setup lang="ts">
import {
  Bold,
  Code2,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from '@lucide/vue'
import type { Editor } from '@tiptap/vue-3'

defineProps<{ editor: Editor }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 border-b p-2" role="toolbar" aria-label="Форматирование документа">
    <UiButton type="button" size="icon-sm" :variant="editor.isActive('bold') ? 'secondary' : 'ghost'" aria-label="Полужирный" title="Полужирный" @click="editor.chain().focus().toggleBold().run()">
      <Bold />
    </UiButton>
    <UiButton type="button" size="icon-sm" :variant="editor.isActive('italic') ? 'secondary' : 'ghost'" aria-label="Курсив" title="Курсив" @click="editor.chain().focus().toggleItalic().run()">
      <Italic />
    </UiButton>
    <UiButton type="button" size="icon-sm" :variant="editor.isActive('strike') ? 'secondary' : 'ghost'" aria-label="Зачёркнутый" title="Зачёркнутый" @click="editor.chain().focus().toggleStrike().run()">
      <Strikethrough />
    </UiButton>
    <UiSeparator orientation="vertical" class="mx-1 h-5" />
    <UiButton type="button" size="icon-sm" :variant="editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'" aria-label="Заголовок" title="Заголовок" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
      <Heading2 />
    </UiButton>
    <UiButton type="button" size="icon-sm" :variant="editor.isActive('bulletList') ? 'secondary' : 'ghost'" aria-label="Маркированный список" title="Маркированный список" @click="editor.chain().focus().toggleBulletList().run()">
      <List />
    </UiButton>
    <UiButton type="button" size="icon-sm" :variant="editor.isActive('orderedList') ? 'secondary' : 'ghost'" aria-label="Нумерованный список" title="Нумерованный список" @click="editor.chain().focus().toggleOrderedList().run()">
      <ListOrdered />
    </UiButton>
    <UiButton type="button" size="icon-sm" :variant="editor.isActive('blockquote') ? 'secondary' : 'ghost'" aria-label="Цитата" title="Цитата" @click="editor.chain().focus().toggleBlockquote().run()">
      <Quote />
    </UiButton>
    <UiButton type="button" size="icon-sm" :variant="editor.isActive('codeBlock') ? 'secondary' : 'ghost'" aria-label="Блок кода" title="Блок кода" @click="editor.chain().focus().toggleCodeBlock().run()">
      <Code2 />
    </UiButton>
    <UiSeparator orientation="vertical" class="mx-1 h-5" />
    <UiButton type="button" size="icon-sm" variant="ghost" :disabled="!editor.can().chain().focus().undo().run()" aria-label="Отменить" title="Отменить" @click="editor.chain().focus().undo().run()">
      <Undo2 />
    </UiButton>
    <UiButton type="button" size="icon-sm" variant="ghost" :disabled="!editor.can().chain().focus().redo().run()" aria-label="Повторить" title="Повторить" @click="editor.chain().focus().redo().run()">
      <Redo2 />
    </UiButton>
  </div>
</template>

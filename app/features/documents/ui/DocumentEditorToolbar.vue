<script setup lang="ts">
import {
  Bold,
  Code2,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Link2,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from '@lucide/vue'
import type { Editor } from '@tiptap/vue-3'
import { computed, ref } from 'vue'
import type { DocumentTreeNode } from '../../../../shared/documents/contracts'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'

interface PageOption {
  readonly id: string
  readonly title: string
  readonly path: string
}

const props = defineProps<{
  editor: Editor
  documents: readonly DocumentTreeNode[]
  currentDocumentId: string
  projectId: string
}>()
const actions = useDocumentsActions()
const linkDialogOpen = ref(false)
const query = ref('')
const imageDialogOpen = ref(false)
const imageFile = ref<File | null>(null)
const imageAlt = ref('')
const imageError = ref<string | null>(null)
const imageInputKey = ref(0)
const uploadingImage = computed(() => actions.isPendingFor(DOCUMENT_ACTION.UPLOAD_IMAGE, props.projectId))

const flattenPages = (nodes: readonly DocumentTreeNode[], ancestors: readonly string[] = []): readonly PageOption[] =>
  nodes.flatMap((node): readonly PageOption[] => {
    const path = [...ancestors, node.title]
    return [
      ...(node.id === props.currentDocumentId ? [] : [{ id: node.id, title: node.title, path: path.join(' / ') }]),
      ...flattenPages(node.children, path),
    ]
  })

const pages = computed(() => flattenPages(props.documents))
const filteredPages = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase('ru-RU')
  return normalized.length === 0
    ? pages.value
    : pages.value.filter(page => page.path.toLocaleLowerCase('ru-RU').includes(normalized))
})

const setLinkDialogOpen = (open: boolean): void => {
  linkDialogOpen.value = open
  if (!open) query.value = ''
}

const insertInternalLink = (document: PageOption): void => {
  const href = `document:${document.id}`
  const chain = props.editor.chain().focus()
  if (props.editor.state.selection.empty) {
    chain.insertContent({
      type: 'text',
      text: document.title,
      marks: [{ type: 'link', attrs: { href } }],
    }).run()
  }
  else {
    chain.setLink({ href }).run()
  }
  setLinkDialogOpen(false)
}

const setImageDialogOpen = (open: boolean): void => {
  imageDialogOpen.value = open
  if (!open) {
    imageFile.value = null
    imageAlt.value = ''
    imageError.value = null
    imageInputKey.value += 1
  }
}

const selectImageFile = (event: Event): void => {
  const target = event.target
  imageFile.value = target instanceof HTMLInputElement ? target.files?.[0] ?? null : null
  imageError.value = null
}

const insertImage = async (): Promise<void> => {
  const file = imageFile.value
  if (!file) {
    imageError.value = 'Выберите изображение.'
    return
  }
  const uploaded = await actions.uploadImage(props.projectId, file)
  if (!uploaded) {
    imageError.value = actions.error.value ?? 'Не удалось загрузить изображение.'
    return
  }
  props.editor.chain().focus().insertContent({
    type: 'image',
    attrs: { imageId: uploaded.id, alt: imageAlt.value.trim() },
  }).run()
  setImageDialogOpen(false)
}
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
    <UiButton type="button" size="icon-sm" variant="ghost" aria-label="Вставить ссылку на страницу" title="Вставить ссылку на страницу" @click="setLinkDialogOpen(true)">
      <Link2 />
    </UiButton>
    <UiButton type="button" size="icon-sm" variant="ghost" aria-label="Вставить изображение" title="Вставить изображение" @click="setImageDialogOpen(true)">
      <ImagePlus />
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

  <UiDialog :open="linkDialogOpen" @update:open="setLinkDialogOpen">
    <UiDialogContent>
      <UiDialogHeader>
        <UiDialogTitle>Вставить ссылку на страницу</UiDialogTitle>
        <UiDialogDescription>
          Выберите страницу проекта. Ссылка продолжит работать после переименования или перемещения страницы.
        </UiDialogDescription>
      </UiDialogHeader>
      <UiField>
        <UiFieldLabel for="internal-link-search" class="sr-only">Поиск страницы</UiFieldLabel>
        <UiInput id="internal-link-search" v-model="query" placeholder="Найти страницу" autofocus />
      </UiField>
      <UiScrollArea class="h-72">
        <div v-if="filteredPages.length > 0" class="flex flex-col gap-1 pr-3">
          <UiButton
            v-for="document in filteredPages"
            :key="document.id"
            type="button"
            variant="ghost"
            class="h-auto justify-start py-2 text-left"
            @click="insertInternalLink(document)"
          >
            <span class="min-w-0">
              <span class="block truncate font-medium">{{ document.title }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{ document.path }}</span>
            </span>
          </UiButton>
        </div>
        <UiEmpty v-else>
          <UiEmptyHeader>
            <UiEmptyTitle>Страницы не найдены</UiEmptyTitle>
            <UiEmptyDescription>Измените поисковый запрос.</UiEmptyDescription>
          </UiEmptyHeader>
        </UiEmpty>
      </UiScrollArea>
    </UiDialogContent>
  </UiDialog>

  <UiDialog :open="imageDialogOpen" @update:open="setImageDialogOpen">
    <UiDialogContent>
      <UiDialogHeader>
        <UiDialogTitle>Вставить изображение</UiDialogTitle>
        <UiDialogDescription>
          PNG, JPEG, GIF или WebP размером не более 10 МБ. Изображение будет доступно только участникам проекта.
        </UiDialogDescription>
      </UiDialogHeader>
      <UiFieldGroup>
        <UiField :data-invalid="imageError !== null">
          <UiFieldLabel for="document-image-file">Файл</UiFieldLabel>
          <UiInput
            :key="imageInputKey"
            id="document-image-file"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            :aria-invalid="imageError !== null"
            @change="selectImageFile"
          />
          <UiFieldError v-if="imageError">{{ imageError }}</UiFieldError>
        </UiField>
        <UiField>
          <UiFieldLabel for="document-image-alt">Описание изображения</UiFieldLabel>
          <UiInput id="document-image-alt" v-model="imageAlt" maxlength="500" placeholder="Например: схема развёртывания" />
          <UiFieldDescription>Используется программами чтения с экрана.</UiFieldDescription>
        </UiField>
      </UiFieldGroup>
      <UiDialogFooter>
        <UiButton type="button" variant="outline" :disabled="uploadingImage" @click="setImageDialogOpen(false)">Отмена</UiButton>
        <UiButton type="button" :disabled="uploadingImage || imageFile === null" @click="insertImage">
          <UiSpinner v-if="uploadingImage" data-icon="inline-start" />
          Загрузить и вставить
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>

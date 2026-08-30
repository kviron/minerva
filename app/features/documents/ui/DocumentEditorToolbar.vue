<script setup lang="ts">
import {
  Bold,
  Columns3,
  Code2,
  Heading2,
  ImagePlus,
  Frame,
  Italic,
  List,
  ListOrdered,
  Link2,
  Quote,
  Redo2,
  Share2,
  Rows3,
  Strikethrough,
  Table2,
  TableCellsMerge,
  TableCellsSplit,
  TableProperties,
  Trash2,
  Undo2,
} from '@lucide/vue'
import type { Editor } from '@tiptap/vue-3'
import { computed, ref } from 'vue'
import type { DocumentTreeNode } from '../../../../shared/documents/contracts'
import {
  buildFigmaExternalUrl,
  parseFigmaEmbedDescriptor,
  parseFigmaEmbedInput,
} from '../../../../shared/embeds/figma'
import {
  FIGMA_EMBED_DEFAULT_HEIGHT,
  FIGMA_EMBED_DEFAULT_WIDTH,
  FIGMA_EMBED_MAX_HEIGHT,
  FIGMA_EMBED_MAX_WIDTH,
  FIGMA_EMBED_MIN_HEIGHT,
  FIGMA_EMBED_MIN_WIDTH,
} from '../../../../shared/embeds/constants'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'
import DocumentShareDialog from './DocumentShareDialog.vue'

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
  statusLabel: string
  saving: boolean
  publishing: boolean
  canSave: boolean
  canPublish: boolean
  canSaveAndPublish: boolean
  canShare: boolean
  hasPublishedVersion: boolean
  viewHref: string
}>()
const emit = defineEmits<{ save: []; publish: [] }>()
const actions = useDocumentsActions()
const linkDialogOpen = ref(false)
const query = ref('')
const imageDialogOpen = ref(false)
const imageFile = ref<File | null>(null)
const imageAlt = ref('')
const imageError = ref<string | null>(null)
const imageInputKey = ref(0)
const figmaDialogOpen = ref(false)
const figmaUrl = ref('')
const figmaTitle = ref('')
const figmaWidth = ref(FIGMA_EMBED_DEFAULT_WIDTH)
const figmaHeight = ref(FIGMA_EMBED_DEFAULT_HEIGHT)
const figmaError = ref<string | null>(null)
const shareDialogOpen = ref(false)
const editingFigmaEmbed = ref(false)
const uploadingImage = computed(() => actions.isPendingFor(DOCUMENT_ACTION.UPLOAD_IMAGE, props.projectId))
const headingLevels = [
  { level: 1, label: 'Заголовок 1', shortcut: 'H1' },
  { level: 2, label: 'Заголовок 2', shortcut: 'H2' },
  { level: 3, label: 'Заголовок 3', shortcut: 'H3' },
  { level: 4, label: 'Заголовок 4', shortcut: 'H4' },
] as const

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

const setFigmaDialogOpen = (open: boolean): void => {
  figmaDialogOpen.value = open
  figmaError.value = null
  if (open) {
    const selected = props.editor.isActive('externalEmbed')
      ? parseFigmaEmbedDescriptor(props.editor.getAttributes('externalEmbed'))
      : null
    editingFigmaEmbed.value = selected !== null
    figmaUrl.value = selected ? buildFigmaExternalUrl(selected) : ''
    figmaTitle.value = selected?.title ?? ''
    figmaWidth.value = selected?.width ?? FIGMA_EMBED_DEFAULT_WIDTH
    figmaHeight.value = selected?.height ?? FIGMA_EMBED_DEFAULT_HEIGHT
    return
  }
  figmaUrl.value = ''
  figmaTitle.value = ''
  figmaWidth.value = FIGMA_EMBED_DEFAULT_WIDTH
  figmaHeight.value = FIGMA_EMBED_DEFAULT_HEIGHT
  editingFigmaEmbed.value = false
}

const insertFigmaEmbed = (): void => {
  const parsed = parseFigmaEmbedInput({
    url: figmaUrl.value,
    title: figmaTitle.value,
    width: figmaWidth.value,
    height: figmaHeight.value,
  })
  if (!parsed.ok) {
    figmaError.value = `Проверьте ссылку Figma, ширину от ${FIGMA_EMBED_MIN_WIDTH} до ${FIGMA_EMBED_MAX_WIDTH} и высоту от ${FIGMA_EMBED_MIN_HEIGHT} до ${FIGMA_EMBED_MAX_HEIGHT} пикселей.`
    return
  }
  if (editingFigmaEmbed.value) {
    props.editor.chain().focus().updateAttributes('externalEmbed', parsed.value).run()
  }
  else {
    props.editor.chain().focus().insertContent({
      type: 'externalEmbed',
      attrs: parsed.value,
    }).run()
  }
  setFigmaDialogOpen(false)
}

const removeFigmaEmbed = (): void => {
  if (editingFigmaEmbed.value) props.editor.chain().focus().deleteSelection().run()
  setFigmaDialogOpen(false)
}
</script>

<template>
  <div class="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b bg-background p-2" role="toolbar" aria-label="Форматирование документа">
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
    <UiButton type="button" size="icon-sm" variant="ghost" aria-label="Вставить материал Figma" title="Вставить материал Figma" @click="setFigmaDialogOpen(true)">
      <Frame />
    </UiButton>
    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <UiButton
          type="button"
          size="icon-sm"
          :variant="editor.isActive('table') ? 'secondary' : 'ghost'"
          aria-label="Таблица"
          title="Таблица"
        >
          <Table2 />
        </UiButton>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="start" class="w-60">
        <UiDropdownMenuGroup>
          <UiDropdownMenuItem @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
            <Table2 />
            Вставить таблицу 3 × 3
          </UiDropdownMenuItem>
        </UiDropdownMenuGroup>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuGroup>
          <UiDropdownMenuItem :disabled="!editor.isActive('table')" @click="editor.chain().focus().addRowAfter().run()">
            <Rows3 />
            Добавить строку ниже
          </UiDropdownMenuItem>
          <UiDropdownMenuItem :disabled="!editor.isActive('table')" @click="editor.chain().focus().deleteRow().run()">
            <Rows3 />
            Удалить строку
          </UiDropdownMenuItem>
          <UiDropdownMenuItem :disabled="!editor.isActive('table')" @click="editor.chain().focus().addColumnAfter().run()">
            <Columns3 />
            Добавить столбец справа
          </UiDropdownMenuItem>
          <UiDropdownMenuItem :disabled="!editor.isActive('table')" @click="editor.chain().focus().deleteColumn().run()">
            <Columns3 />
            Удалить столбец
          </UiDropdownMenuItem>
        </UiDropdownMenuGroup>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuGroup>
          <UiDropdownMenuItem :disabled="!editor.isActive('table')" @click="editor.chain().focus().toggleHeaderRow().run()">
            <TableProperties />
            Переключить строку заголовков
          </UiDropdownMenuItem>
          <UiDropdownMenuItem :disabled="!editor.can().chain().focus().mergeCells().run()" @click="editor.chain().focus().mergeCells().run()">
            <TableCellsMerge />
            Объединить ячейки
          </UiDropdownMenuItem>
          <UiDropdownMenuItem :disabled="!editor.can().chain().focus().splitCell().run()" @click="editor.chain().focus().splitCell().run()">
            <TableCellsSplit />
            Разделить ячейку
          </UiDropdownMenuItem>
        </UiDropdownMenuGroup>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuItem class="text-destructive focus:text-destructive" :disabled="!editor.isActive('table')" @click="editor.chain().focus().deleteTable().run()">
          <Trash2 />
          Удалить таблицу
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>
    <UiSeparator orientation="vertical" class="mx-1 h-5" />
    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <UiButton
          type="button"
          size="icon-sm"
          :variant="headingLevels.some(({ level }) => editor.isActive('heading', { level })) ? 'secondary' : 'ghost'"
          aria-label="Уровень заголовка"
          title="Уровень заголовка"
        >
          <Heading2 />
        </UiButton>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="start" class="w-44">
        <UiDropdownMenuGroup>
          <UiDropdownMenuItem
            v-for="{ level, label, shortcut } in headingLevels"
            :key="level"
            :class="editor.isActive('heading', { level }) && 'bg-accent'"
            @select="editor.chain().focus().toggleHeading({ level }).run()"
          >
            {{ label }}
            <UiDropdownMenuShortcut>{{ shortcut }}</UiDropdownMenuShortcut>
          </UiDropdownMenuItem>
        </UiDropdownMenuGroup>
      </UiDropdownMenuContent>
    </UiDropdownMenu>
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
    <div class="ml-auto flex items-center gap-2">
      <span class="text-xs text-muted-foreground" aria-live="polite">{{ statusLabel }}</span>
      <UiButton size="sm" :disabled="saving || !canSave" @click="emit('save')">
        <UiSpinner v-if="saving" data-icon="inline-start" />
        Сохранить
      </UiButton>
      <UiButton
        v-if="canPublish"
        size="sm"
        :disabled="saving || publishing || !canSaveAndPublish"
        @click="emit('publish')"
      >
        <UiSpinner v-if="publishing" data-icon="inline-start" />
        Сохранить и опубликовать
      </UiButton>
      <UiButton as-child variant="outline" size="sm">
        <NuxtLink :to="viewHref">Просмотр</NuxtLink>
      </UiButton>
      <UiButton v-if="canShare" variant="outline" size="sm" @click="shareDialogOpen = true">
        <Share2 data-icon="inline-start" />
        Поделиться
      </UiButton>
    </div>
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

  <UiDialog :open="figmaDialogOpen" @update:open="setFigmaDialogOpen">
    <UiDialogContent>
      <UiDialogHeader>
        <UiDialogTitle>{{ editingFigmaEmbed ? 'Настроить материал Figma' : 'Вставить материал Figma' }}</UiDialogTitle>
        <UiDialogDescription>
          Поддерживаются ссылки на Figma Design, прототипы, FigJam и Figma Slides. Доступ к приватному файлу контролирует Figma.
        </UiDialogDescription>
      </UiDialogHeader>
      <UiFieldGroup>
        <UiField :data-invalid="figmaError !== null">
          <UiFieldLabel for="document-figma-url">Ссылка Figma</UiFieldLabel>
          <UiInput
            id="document-figma-url"
            v-model="figmaUrl"
            type="url"
            placeholder="https://www.figma.com/design/..."
            :aria-invalid="figmaError !== null"
            @input="figmaError = null"
          />
          <UiFieldError v-if="figmaError">{{ figmaError }}</UiFieldError>
        </UiField>
        <UiField>
          <UiFieldLabel for="document-figma-title">Название</UiFieldLabel>
          <UiInput id="document-figma-title" v-model="figmaTitle" maxlength="200" placeholder="Например: макет главной страницы" />
          <UiFieldDescription>Название отображается над виджетом и используется программами чтения с экрана.</UiFieldDescription>
        </UiField>
          <UiField :data-invalid="figmaWidth < FIGMA_EMBED_MIN_WIDTH || figmaWidth > FIGMA_EMBED_MAX_WIDTH">
          <UiFieldLabel for="document-figma-width">Ширина, пиксели</UiFieldLabel>
          <UiInput
            id="document-figma-width"
            v-model.number="figmaWidth"
            type="number"
            :min="FIGMA_EMBED_MIN_WIDTH"
            :max="FIGMA_EMBED_MAX_WIDTH"
            step="10"
            :aria-invalid="figmaWidth < FIGMA_EMBED_MIN_WIDTH || figmaWidth > FIGMA_EMBED_MAX_WIDTH"
          />
        </UiField>
        <UiField :data-invalid="figmaHeight < FIGMA_EMBED_MIN_HEIGHT || figmaHeight > FIGMA_EMBED_MAX_HEIGHT">
          <UiFieldLabel for="document-figma-height">Высота, пиксели</UiFieldLabel>
          <UiInput
            id="document-figma-height"
            v-model.number="figmaHeight"
            type="number"
            :min="FIGMA_EMBED_MIN_HEIGHT"
            :max="FIGMA_EMBED_MAX_HEIGHT"
            step="10"
            :aria-invalid="figmaHeight < FIGMA_EMBED_MIN_HEIGHT || figmaHeight > FIGMA_EMBED_MAX_HEIGHT"
          />
        </UiField>
      </UiFieldGroup>
      <UiDialogFooter>
        <UiButton v-if="editingFigmaEmbed" type="button" variant="destructive" @click="removeFigmaEmbed">Удалить</UiButton>
        <UiButton type="button" variant="outline" @click="setFigmaDialogOpen(false)">Отмена</UiButton>
        <UiButton
          type="button"
          :disabled="figmaUrl.trim().length === 0 || figmaWidth < FIGMA_EMBED_MIN_WIDTH || figmaWidth > FIGMA_EMBED_MAX_WIDTH || figmaHeight < FIGMA_EMBED_MIN_HEIGHT || figmaHeight > FIGMA_EMBED_MAX_HEIGHT"
          @click="insertFigmaEmbed"
        >{{ editingFigmaEmbed ? 'Сохранить' : 'Вставить' }}</UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
  <DocumentShareDialog
    :open="shareDialogOpen"
    :project-id="projectId"
    :document-id="currentDocumentId"
    :has-published-version="hasPublishedVersion"
    @update:open="shareDialogOpen = $event"
  />
</template>

import { Node } from '@tiptap/core'
import {
  buildFigmaEmbedUrl,
  buildFigmaExternalUrl,
  parseFigmaEmbedDescriptor,
} from '../../../../shared/embeds/figma'
import type { EmbedTheme } from '../../../../shared/embeds/constants'
import {
  FIGMA_EMBED_MAX_HEIGHT,
  FIGMA_EMBED_MAX_WIDTH,
  FIGMA_EMBED_MIN_HEIGHT,
  FIGMA_EMBED_MIN_WIDTH,
} from '../../../../shared/embeds/constants'

const FIGMA_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'

export interface DocumentEmbedThemeCapabilities {
  readonly current: () => EmbedTheme
  readonly subscribe: (listener: (theme: EmbedTheme) => void) => () => void
}

export type DocumentEmbedResizeAxis = 'width' | 'height' | 'both'

interface DocumentEmbedResizeInput {
  readonly startWidth: number
  readonly startHeight: number
  readonly deltaX: number
  readonly deltaY: number
  readonly axis: DocumentEmbedResizeAxis
  readonly preserveAspectRatio: boolean
}

interface DocumentEmbedSize {
  readonly width: number
  readonly height: number
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Math.round(value)))

export const calculateDocumentEmbedSize = (input: DocumentEmbedResizeInput): DocumentEmbedSize => {
  if (!input.preserveAspectRatio) {
    return {
      width: input.axis === 'height' ? Math.round(input.startWidth) : clamp(input.startWidth + input.deltaX, FIGMA_EMBED_MIN_WIDTH, FIGMA_EMBED_MAX_WIDTH),
      height: input.axis === 'width' ? Math.round(input.startHeight) : clamp(input.startHeight + input.deltaY, FIGMA_EMBED_MIN_HEIGHT, FIGMA_EMBED_MAX_HEIGHT),
    }
  }
  const horizontalChange = Math.abs(input.deltaX / input.startWidth)
  const verticalChange = Math.abs(input.deltaY / input.startHeight)
  const requestedScale = input.axis === 'width'
    ? (input.startWidth + input.deltaX) / input.startWidth
    : input.axis === 'height'
      ? (input.startHeight + input.deltaY) / input.startHeight
      : horizontalChange >= verticalChange
        ? (input.startWidth + input.deltaX) / input.startWidth
        : (input.startHeight + input.deltaY) / input.startHeight
  const minimumScale = Math.max(FIGMA_EMBED_MIN_WIDTH / input.startWidth, FIGMA_EMBED_MIN_HEIGHT / input.startHeight)
  const maximumScale = Math.min(FIGMA_EMBED_MAX_WIDTH / input.startWidth, FIGMA_EMBED_MAX_HEIGHT / input.startHeight)
  const scale = Math.min(maximumScale, Math.max(minimumScale, requestedScale))
  return {
    width: Math.round(input.startWidth * scale),
    height: Math.round(input.startHeight * scale),
  }
}

export const createDocumentEmbedExtension = (theme: DocumentEmbedThemeCapabilities) => Node.create({
  name: 'externalEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  isolating: true,
  addAttributes() {
    return {
      schemaVersion: { default: null },
      provider: { default: null },
      resourceType: { default: null },
      resourceKey: { default: null },
      nodeId: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'figure[data-document-external-embed="figma"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    const descriptor = parseFigmaEmbedDescriptor(HTMLAttributes)
    return descriptor
      ? ['figure', { 'data-document-external-embed': 'figma' }, ['figcaption', {}, descriptor.title]]
      : ['p', { 'data-invalid-document-embed': '' }, 'Недоступный внешний материал']
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentNode = node
      const wrapper = document.createElement('figure')
      wrapper.className = 'relative my-3 inline-block max-w-full self-start overflow-hidden rounded-md border bg-background'
      wrapper.contentEditable = 'false'

      const header = document.createElement('figcaption')
      header.className = 'flex items-center justify-between gap-3 border-b px-3 py-2 text-sm'
      const title = document.createElement('span')
      title.className = 'truncate font-medium'
      const link = document.createElement('a')
      link.className = 'shrink-0 text-primary underline underline-offset-4'
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.textContent = 'Открыть в Figma'
      header.append(title, link)

      const iframe = document.createElement('iframe')
      iframe.className = 'block w-full border-0'
      iframe.loading = 'lazy'
      iframe.referrerPolicy = 'strict-origin-when-cross-origin'
      iframe.setAttribute('allow', 'fullscreen')
      iframe.setAttribute('sandbox', FIGMA_IFRAME_SANDBOX)
      wrapper.append(header, iframe)

      let removePointerListeners: (() => void) | null = null
      const resizeHandleBindings: Array<{ handle: HTMLButtonElement, listener: (event: PointerEvent) => void }> = []

      const render = (attrs: unknown, activeTheme = theme.current()): boolean => {
        const descriptor = parseFigmaEmbedDescriptor(attrs)
        if (!descriptor) return false
        title.textContent = descriptor.title
        link.href = buildFigmaExternalUrl(descriptor)
        iframe.src = buildFigmaEmbedUrl(descriptor, activeTheme)
        iframe.title = descriptor.title
        wrapper.style.width = `min(100%, ${descriptor.width}px)`
        iframe.height = String(descriptor.height)
        return true
      }

      const finishResize = (size: DocumentEmbedSize): void => {
        const position = getPos()
        if (typeof position !== 'number') return
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(position, undefined, {
          ...currentNode.attrs,
          width: size.width,
          height: size.height,
        }))
      }

      const startResize = (axis: DocumentEmbedResizeAxis) => (event: PointerEvent): void => {
        event.preventDefault()
        const startX = event.clientX
        const startY = event.clientY
        const wrapperBounds = wrapper.getBoundingClientRect()
        const iframeBounds = iframe.getBoundingClientRect()
        const startWidth = wrapperBounds.width
        const startHeight = iframeBounds.height
        let size: DocumentEmbedSize = { width: Math.round(startWidth), height: Math.round(startHeight) }
        const move = (moveEvent: PointerEvent): void => {
          size = calculateDocumentEmbedSize({
            startWidth,
            startHeight,
            deltaX: moveEvent.clientX - startX,
            deltaY: moveEvent.clientY - startY,
            axis,
            preserveAspectRatio: moveEvent.shiftKey,
          })
          wrapper.style.width = `min(100%, ${size.width}px)`
          iframe.height = String(size.height)
        }
        const end = (): void => {
          removePointerListeners?.()
          finishResize(size)
        }
        removePointerListeners = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', end)
          removePointerListeners = null
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', end, { once: true })
      }

      const createResizeHandle = (axis: DocumentEmbedResizeAxis, label: string, positionClass: string): void => {
        const handle = document.createElement('button')
        handle.type = 'button'
        handle.className = `absolute border-0 bg-transparent p-0 opacity-0 ${positionClass}`
        handle.setAttribute('aria-label', label)
        handle.title = `${label}. Удерживайте Shift, чтобы сохранить пропорции`
        const listener = startResize(axis)
        handle.addEventListener('pointerdown', listener)
        resizeHandleBindings.push({ handle, listener })
        wrapper.append(handle)
      }
      render(node.attrs)
      createResizeHandle('width', 'Изменить ширину виджета', 'right-0 top-0 h-full w-3 cursor-ew-resize')
      createResizeHandle('height', 'Изменить высоту виджета', 'bottom-0 left-0 h-3 w-full cursor-ns-resize')
      createResizeHandle('both', 'Изменить размер виджета', 'bottom-0 right-0 size-5 cursor-nwse-resize')
      const unsubscribeTheme = theme.subscribe(activeTheme => render(currentNode.attrs, activeTheme))

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== 'externalEmbed') return false
          currentNode = updatedNode
          return render(updatedNode.attrs)
        },
        stopEvent: event => (event.target instanceof HTMLIFrameElement || event.target instanceof HTMLAnchorElement)
          || (event.target instanceof HTMLButtonElement && resizeHandleBindings.some(binding => binding.handle === event.target)),
        destroy() {
          unsubscribeTheme()
          removePointerListeners?.()
          for (const binding of resizeHandleBindings) {
            binding.handle.removeEventListener('pointerdown', binding.listener)
          }
        },
      }
    }
  },
})

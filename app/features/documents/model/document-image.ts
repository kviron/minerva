import { mergeAttributes, Node } from '@tiptap/core'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export const documentImageId = (value: unknown): string | null =>
  typeof value === 'string' && UUID_PATTERN.test(value) ? value.toLowerCase() : null

export const documentImageUrl = (projectId: string, imageId: string): string =>
  `/api/projects/${projectId}/documents/images/${imageId}`

export const documentImageDownloadUrl = (projectId: string, imageId: string): string =>
  `${documentImageUrl(projectId, imageId)}?download=1`

export const documentImageWidth = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 160 && value <= 1600 ? value : null

export const documentImageHeight = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 90 && value <= 1600 ? value : null

interface DocumentImageResizeInput {
  readonly startWidth: number
  readonly startHeight: number
  readonly deltaX: number
  readonly deltaY: number
  readonly axis: DocumentImageResizeAxis
  readonly preserveAspectRatio: boolean
}

type DocumentImageResizeAxis = 'width' | 'height' | 'both'

interface DocumentImageSize {
  readonly width: number
  readonly height: number
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Math.round(value)))

export const calculateDocumentImageSize = (input: DocumentImageResizeInput): DocumentImageSize => {
  if (!input.preserveAspectRatio) {
    return {
      width: input.axis === 'height' ? Math.round(input.startWidth) : clamp(input.startWidth + input.deltaX, 160, 1600),
      height: input.axis === 'width' ? Math.round(input.startHeight) : clamp(input.startHeight + input.deltaY, 90, 1600),
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
  const minimumScale = Math.max(160 / input.startWidth, 90 / input.startHeight)
  const maximumScale = Math.min(1600 / input.startWidth, 1600 / input.startHeight)
  const scale = Math.min(maximumScale, Math.max(minimumScale, requestedScale))
  return {
    width: Math.round(input.startWidth * scale),
    height: Math.round(input.startHeight * scale),
  }
}

export const createDocumentImageExtension = (projectId: string) => Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      imageId: { default: null },
      alt: { default: '' },
      width: { default: null },
      height: { default: null },
    }
  },
  renderHTML({ HTMLAttributes }) {
    const imageId = documentImageId(HTMLAttributes.imageId)
    if (!imageId) return ['span', { 'data-invalid-document-image': '' }, 'Недоступное изображение']
    const alt = typeof HTMLAttributes.alt === 'string' ? HTMLAttributes.alt : ''
    const width = documentImageWidth(HTMLAttributes.width)
    const height = documentImageHeight(HTMLAttributes.height)
    return ['img', mergeAttributes({
      src: documentImageUrl(projectId, imageId),
      alt,
      'data-document-image-id': imageId,
      class: 'my-4 max-w-full rounded-md object-cover',
      ...((width || height) ? { style: `${width ? `width: min(100%, ${width}px);` : ''}${height ? `height: ${height}px;` : ''}` } : {}),
    })]
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'relative my-4 inline-block max-w-full self-start align-top'
      wrapper.contentEditable = 'false'

      const image = document.createElement('img')
      image.className = 'block max-w-full rounded-md border object-cover'
      image.draggable = false
      wrapper.append(image)

      let currentNode = node
      let removePointerListeners: (() => void) | null = null
      const resizeHandleBindings: Array<{ handle: HTMLButtonElement, listener: (event: PointerEvent) => void }> = []

      const render = (): void => {
        const imageId = documentImageId(currentNode.attrs.imageId)
        image.src = imageId ? documentImageUrl(projectId, imageId) : ''
        image.alt = typeof currentNode.attrs.alt === 'string' ? currentNode.attrs.alt : ''
        const width = documentImageWidth(currentNode.attrs.width)
        const height = documentImageHeight(currentNode.attrs.height)
        image.style.width = width ? `${width}px` : 'auto'
        image.style.height = height ? `${height}px` : 'auto'
      }

      const finishResize = (size: DocumentImageSize): void => {
        const position = getPos()
        if (typeof position !== 'number') return
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(position, undefined, {
          ...currentNode.attrs,
          width: size.width,
          height: size.height,
        }))
      }

      const startResize = (axis: DocumentImageResizeAxis) => (event: PointerEvent): void => {
        event.preventDefault()
        const startX = event.clientX
        const startY = event.clientY
        const bounds = image.getBoundingClientRect()
        const startWidth = bounds.width
        const startHeight = bounds.height
        let size: DocumentImageSize = { width: Math.round(startWidth), height: Math.round(startHeight) }
        const move = (moveEvent: PointerEvent): void => {
          size = calculateDocumentImageSize({
            startWidth,
            startHeight,
            deltaX: moveEvent.clientX - startX,
            deltaY: moveEvent.clientY - startY,
            axis,
            preserveAspectRatio: moveEvent.shiftKey,
          })
          image.style.width = `${size.width}px`
          image.style.height = `${size.height}px`
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

      const createResizeHandle = (
        axis: DocumentImageResizeAxis,
        label: string,
        positionClass: string,
      ): void => {
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

      createResizeHandle('width', 'Изменить ширину изображения', 'right-0 top-0 h-full w-3 cursor-ew-resize')
      createResizeHandle('height', 'Изменить высоту изображения', 'bottom-0 left-0 h-3 w-full cursor-ns-resize')
      createResizeHandle('both', 'Изменить размер изображения', 'bottom-0 right-0 size-5 cursor-nwse-resize')
      render()
      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type !== currentNode.type) return false
          currentNode = updatedNode
          render()
          return true
        },
        stopEvent: event => event.target instanceof HTMLButtonElement
          && resizeHandleBindings.some(binding => binding.handle === event.target),
        destroy() {
          removePointerListeners?.()
          for (const binding of resizeHandleBindings) {
            binding.handle.removeEventListener('pointerdown', binding.listener)
          }
        },
      }
    }
  },
})

import type {
  DocumentContent,
  DocumentContentNode,
  DocumentRelationItem,
} from '../../../../shared/documents/contracts'
import { buildFigmaExternalUrl, parseFigmaEmbedDescriptor } from '../../../../shared/embeds/figma'
import { documentImageDownloadUrl, documentImageId, documentImageUrl } from './document-image'

export const DOCUMENT_DETAILS_TAB = {
  IMAGES: 'images',
  FILES: 'files',
  LINKS: 'links',
  HISTORY: 'history',
} as const

export type DocumentDetailsTab = typeof DOCUMENT_DETAILS_TAB[keyof typeof DOCUMENT_DETAILS_TAB]

export interface DocumentImageAttachment {
  readonly id: string
  readonly alt: string
  readonly url: string
  readonly downloadUrl: string
}

export interface DocumentFileAttachment {
  readonly id: string
  readonly name: string
}

export type DocumentLinkAttachment =
  | { readonly kind: 'internal', readonly href: string, readonly label: string }
  | { readonly kind: 'external', readonly href: string, readonly label: string }
  | { readonly kind: 'embed', readonly href: string, readonly label: string }

export interface DocumentAttachments {
  readonly images: readonly DocumentImageAttachment[]
  readonly files: readonly DocumentFileAttachment[]
  readonly links: readonly DocumentLinkAttachment[]
}

export interface CollectDocumentAttachmentsInput {
  readonly projectId: string
  readonly content: DocumentContent
  readonly internalLinks: readonly DocumentRelationItem[]
}

const INTERNAL_DOCUMENT_LINK_PATTERN = /^document:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu

const safeExternalHref = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:'
      ? url.toString()
      : null
  }
  catch {
    return null
  }
}

export const collectDocumentAttachments = (input: CollectDocumentAttachmentsInput): DocumentAttachments => {
  const images: DocumentImageAttachment[] = []
  const files: DocumentFileAttachment[] = []
  const links: DocumentLinkAttachment[] = []
  const seenImages = new Set<string>()
  const seenLinks = new Set<string>()
  const internalLinks = new Map(input.internalLinks.map(link => [link.id.toLowerCase(), link]))

  const appendLink = (link: DocumentLinkAttachment): void => {
    if (seenLinks.has(link.href)) {
      return
    }
    seenLinks.add(link.href)
    links.push(link)
  }

  const visit = (node: DocumentContentNode): void => {
    if (node.type === 'image') {
      const id = documentImageId(node.attrs?.imageId)
      if (id && !seenImages.has(id)) {
        seenImages.add(id)
        images.push({
          id,
          alt: typeof node.attrs?.alt === 'string' ? node.attrs.alt : '',
          url: documentImageUrl(input.projectId, id),
          downloadUrl: documentImageDownloadUrl(input.projectId, id),
        })
      }
    }

    if (node.type === 'text') {
      for (const mark of node.marks ?? []) {
        if (mark.type !== 'link') {
          continue
        }
        const href = mark.attrs?.href
        if (typeof href !== 'string') {
          continue
        }
        const internalMatch = INTERNAL_DOCUMENT_LINK_PATTERN.exec(href)
        const targetId = internalMatch?.[1]?.toLowerCase()
        const target = targetId ? internalLinks.get(targetId) : undefined
        if (target) {
          appendLink({
            kind: 'internal',
            href: `/projects/${input.projectId}/documents/${target.id}`,
            label: target.title,
          })
          continue
        }
        const externalHref = safeExternalHref(href)
        if (externalHref) {
          appendLink({
            kind: 'external',
            href: externalHref,
            label: node.text?.trim() || externalHref,
          })
        }
      }
    }

    if (node.type === 'externalEmbed') {
      const descriptor = parseFigmaEmbedDescriptor(node.attrs)
      if (descriptor) {
        appendLink({
          kind: 'embed',
          href: buildFigmaExternalUrl(descriptor),
          label: descriptor.title,
        })
      }
    }

    for (const child of node.content ?? []) {
      visit(child)
    }
  }

  for (const node of input.content.content) {
    visit(node)
  }

  return { images, files, links }
}

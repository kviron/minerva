import type { DocumentContent } from '../../../shared/documents/contracts'
import type {
  PublicDocumentInternalLink,
  PublicDocumentPage,
  PublicDocumentTreeNode,
} from '../../../shared/documents/public-share-contracts'
import {
  DOCUMENT_PUBLIC_SHARE_SCOPE,
} from '../../../shared/documents/public-share-constants'
import { extractInternalDocumentLinkTargetIds } from './content-schema'

type ShareScope = typeof DOCUMENT_PUBLIC_SHARE_SCOPE[keyof typeof DOCUMENT_PUBLIC_SHARE_SCOPE]

export interface PublicDocumentVersionCandidate {
  readonly title: string
  readonly content: DocumentContent
  readonly publishedAt: string
  readonly referencedImageIds: readonly string[]
}

export interface PublicDocumentCandidate {
  readonly id: string
  readonly parentId: string | null
  readonly position: number
  readonly slug: string
  readonly version: PublicDocumentVersionCandidate | null
}

interface Input {
  readonly scope: ShareScope
  readonly rootDocumentId: string
  readonly selectedDocumentId: string
  readonly documents: readonly PublicDocumentCandidate[]
}

export interface DerivedPublicDocumentProjection {
  readonly page: PublicDocumentPage
  readonly tree: readonly PublicDocumentTreeNode[]
  readonly eligibleDocumentIds: readonly string[]
  readonly referencedImageIds: readonly string[]
}

const compareDocuments = (left: PublicDocumentCandidate, right: PublicDocumentCandidate): number =>
  left.position - right.position || left.id.localeCompare(right.id)

export const derivePublicDocumentProjection = (input: Input): DerivedPublicDocumentProjection | null => {
  const byId = new Map(input.documents.map(document => [document.id, document]))
  const root = byId.get(input.rootDocumentId)
  if (!root?.version) return null

  const childrenByParent = new Map<string, PublicDocumentCandidate[]>()
  for (const document of input.documents) {
    if (document.parentId === null) continue
    const children = childrenByParent.get(document.parentId) ?? []
    children.push(document)
    childrenByParent.set(document.parentId, children)
  }
  for (const children of childrenByParent.values()) children.sort(compareDocuments)

  const eligible = new Map<string, PublicDocumentCandidate>()
  const visit = (document: PublicDocumentCandidate): void => {
    if (!document.version || eligible.has(document.id)) return
    eligible.set(document.id, document)
    if (input.scope === DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT) return
    for (const child of childrenByParent.get(document.id) ?? []) visit(child)
  }
  visit(root)

  if (
    input.scope === DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT
    && input.selectedDocumentId !== input.rootDocumentId
  ) return null
  const selected = eligible.get(input.selectedDocumentId)
  if (!selected?.version) return null

  const toTreeNode = (document: PublicDocumentCandidate): PublicDocumentTreeNode => ({
    id: document.id,
    title: document.version?.title ?? '',
    slug: document.slug,
    children: (childrenByParent.get(document.id) ?? [])
      .filter(child => eligible.has(child.id))
      .map(toTreeNode),
  })
  const eligibleDocumentIds = [...eligible.keys()]
  const eligibleIdSet = new Set(eligibleDocumentIds)
  const internalLinks: readonly PublicDocumentInternalLink[] = extractInternalDocumentLinkTargetIds(
    selected.version.content,
  ).map(documentId => ({ documentId, available: eligibleIdSet.has(documentId) }))

  return {
    page: {
      id: selected.id,
      title: selected.version.title,
      slug: selected.slug,
      content: selected.version.content,
      publishedAt: selected.version.publishedAt,
      internalLinks,
    },
    tree: input.scope === DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH ? [toTreeNode(root)] : [],
    eligibleDocumentIds,
    referencedImageIds: [...new Set(
      [...eligible.values()].flatMap(document => document.version?.referencedImageIds ?? []),
    )],
  }
}

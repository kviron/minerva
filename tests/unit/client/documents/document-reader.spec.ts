import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mocks = vi.hoisted(() => ({
  documentsApi: {
    listRoots: vi.fn(),
    create: vi.fn(),
    listTree: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('../../../../app/features/documents/api/documents-api', () => ({ documentsApi: mocks.documentsApi }))

import { DocumentsActions } from '../../../../app/features/documents/model/actions/actions'
import { useDocumentsStore } from '../../../../app/features/documents/model/documents-state'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')
const tree = [{
  id: 'root-1',
  title: 'Архитектура',
  slug: 'architecture',
  updatedAt: '2026-07-14T10:00:00.000Z',
  publicationState: 'published',
  children: [],
}] as const
const document = {
  id: 'root-1',
  title: 'Архитектура',
  slug: 'architecture',
  parentId: null,
  draftRevision: 1,
  draftContent: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Обзор' }] }] },
  publicationState: 'published',
  updatedAt: '2026-07-14T10:00:00.000Z',
  ancestors: [],
  children: [],
} as const

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mocks.documentsApi.listTree.mockResolvedValue(tree)
  mocks.documentsApi.get.mockResolvedValue(document)
})

describe('document reader', () => {
  it('loads tree and selected document through stateless actions and applies copied projections explicitly', async () => {
    const actions = new DocumentsActions()
    const store = useDocumentsStore()

    const [loadedTree, loadedDocument] = await Promise.all([
      actions.loadTree('project-1'),
      actions.loadDocument('project-1', 'root-1'),
    ])
    store.applyTree(loadedTree ?? [])
    store.applyCurrent(loadedDocument)

    expect(mocks.documentsApi.listTree).toHaveBeenCalledWith('project-1', expect.anything())
    expect(mocks.documentsApi.get).toHaveBeenCalledWith('project-1', 'root-1', expect.anything())
    expect(store.tree).toEqual(tree)
    expect(store.tree).not.toBe(tree)
    expect(store.current).toEqual(document)
  })

  it('composes the detail route from a tree, safe content renderer, and reader states', async () => {
    const [page, workspace, treeSource, branchSource, viewer, renderer, breadcrumbs] = await Promise.all([
      read('../../../../app/pages/projects/[id]/documents/[documentId]/index.vue'),
      read('../../../../app/features/documents/ui/DocumentWorkspace.vue'),
      read('../../../../app/features/documents/ui/DocumentTree.vue'),
      read('../../../../app/features/documents/ui/DocumentTreeBranch.vue'),
      read('../../../../app/features/documents/ui/DocumentViewer.vue'),
      read('../../../../app/features/documents/ui/DocumentContentNode.vue'),
      read('../../../../app/features/navigation/ui/AppBreadcrumbs.vue'),
    ])

    expect(page).toContain('<DocumentsProvider>')
    expect(page).toContain('<DocumentWorkspace')
    expect(workspace).toContain('<DocumentTree')
    expect(workspace).toContain('<DocumentViewer')
    expect(workspace).toContain('UiSkeleton')
    expect(workspace).toContain('UiAlert')
    expect(treeSource).toContain('UiScrollArea')
    expect(treeSource).toContain('DocumentTreeBranch')
    expect(treeSource).toContain('mb-2 text-sm font-medium')
    expect(treeSource).toContain('flex flex-col gap-0.5 pr-3')
    expect(treeSource).not.toContain('pl-2 pr-3')
    expect(branchSource).not.toContain('span v-else class="size-5 shrink-0"')
    expect(viewer).toContain('document.ancestors')
    expect(viewer).toContain('<DocumentContentNode')
    expect(renderer).not.toContain('v-html')
    expect(breadcrumbs).toContain('useDocumentsStore')
    expect(breadcrumbs).toContain('documentsState.current.title')
  })
})

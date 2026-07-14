import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(path, 'utf8')

describe('create a child document from the document tree', () => {
  it('offers the permission-aware action and forwards the selected parent through recursive branches', async () => {
    const branch = await read('app/features/documents/ui/DocumentTreeBranch.vue')

    expect(branch).toContain('PROJECT_PERMISSION.DOCUMENTS_CREATE')
    expect(branch).toContain("create: [node: DocumentTreeNode]")
    expect(branch).toContain("@select=\"emit('create', node)\"")
    expect(branch).toContain("@create=\"emit('create', $event)\"")
    expect(branch).toContain('Добавить')
  })

  it('locks the selected tree page as parent and opens the created child', async () => {
    const [tree, dialog] = await Promise.all([
      read('app/features/documents/ui/DocumentTree.vue'),
      read('app/features/documents/ui/CreateDocumentDialog.vue'),
    ])

    expect(tree).toContain('@create="openCreate"')
    expect(tree).toContain(':fixed-parent="selectedParent ?? undefined"')
    expect(tree).toContain('parentId: selected.id')
    expect(tree).toContain('navigateTo(`/projects/${props.projectId}/documents/${result.documentId}`)')
    expect(dialog).toContain('fixedParent?: DocumentRelationItem')
    expect(dialog).toContain("parent.value = open ? props.fixedParent?.id ?? ROOT_PARENT : ROOT_PARENT")
    expect(dialog).toContain('v-if="fixedParent"')
  })
})

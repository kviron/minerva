import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document tree discard action', () => {
  it('shows delete only for a fully never-published branch and otherwise keeps archive', async () => {
    const [branch, tree, contracts] = await Promise.all([
      readFile('app/features/documents/ui/DocumentTreeBranch.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentTree.vue', 'utf8'),
      readFile('shared/documents/contracts.ts', 'utf8'),
    ])

    expect(contracts).toContain('readonly hasPublishedVersions: boolean')
    expect(branch).toContain('const canDiscardBranch')
    expect(branch).toContain('Удалить')
    expect(branch).toContain("emit('discard', node)")
    expect(branch).toContain('В архив')
    expect(tree).toContain('Удалить ветку без возможности восстановления?')
    expect(tree).toContain('actions.discard')
  })
})

import { describe, expect, it } from 'vitest'
import { decodeProjectListCursor, encodeProjectListCursor } from '../../../server/modules/projects/project-list-cursor'

describe('project list cursor', () => {
  it('round-trips the stable sort values', () => {
    const cursor = { updatedAt: new Date('2026-07-16T10:00:00.000Z'), id: '21b9fc31-6e20-4399-a2ea-fb4de1024821' }
    expect(decodeProjectListCursor(encodeProjectListCursor(cursor))).toEqual(cursor)
  })

  it('rejects malformed cursors', () => {
    expect(() => decodeProjectListCursor('not-a-cursor')).toThrow()
  })
})

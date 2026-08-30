import { describe, expect, it } from 'vitest'
import {
  PROJECT_ICON_ERROR,
  projectIconObjectKey,
  validateProjectIconUpload,
} from '../../../server/modules/projects/project-icons'

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])

describe('project icons', () => {
  it('accepts bounded raster images with matching signatures', () => {
    expect(validateProjectIconUpload({ mimeType: 'image/png', bytes: png })).toEqual({
      ok: true,
      value: { mimeType: 'image/png', bytes: png },
    })
  })

  it('rejects SVG, mismatched signatures, empty files, and oversized files', () => {
    expect(validateProjectIconUpload({ mimeType: 'image/svg+xml', bytes: Buffer.from('<svg/>') })).toEqual({
      ok: false,
      code: PROJECT_ICON_ERROR.INVALID_IMAGE,
    })
    expect(validateProjectIconUpload({ mimeType: 'image/png', bytes: Buffer.from('not png') }).ok).toBe(false)
    expect(validateProjectIconUpload({ mimeType: 'image/png', bytes: Buffer.alloc(0) }).ok).toBe(false)
    expect(validateProjectIconUpload({ mimeType: 'image/png', bytes: Buffer.alloc(2 * 1024 * 1024 + 1) }).ok).toBe(false)
  })

  it('creates a project-scoped private object key', () => {
    expect(projectIconObjectKey('project-id', 'icon-id')).toBe('projects/project-id/icons/icon-id')
  })
})

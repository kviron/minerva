import { describe, expect, it } from 'vitest'
import { calculateDocumentEmbedSize } from '../../../../app/features/documents/model/document-embed'

describe('document embed resizing', () => {
  it('resizes width, height, and both dimensions with bounded integer values', () => {
    expect(calculateDocumentEmbedSize({
      startWidth: 960,
      startHeight: 520,
      deltaX: 100,
      deltaY: 80,
      axis: 'both',
      preserveAspectRatio: false,
    })).toEqual({ width: 1060, height: 600 })
    expect(calculateDocumentEmbedSize({
      startWidth: 400,
      startHeight: 400,
      deltaX: -500,
      deltaY: 700,
      axis: 'both',
      preserveAspectRatio: false,
    })).toEqual({ width: 320, height: 900 })
  })

  it('preserves the starting aspect ratio while Shift is held', () => {
    expect(calculateDocumentEmbedSize({
      startWidth: 800,
      startHeight: 400,
      deltaX: 200,
      deltaY: 10,
      axis: 'both',
      preserveAspectRatio: true,
    })).toEqual({ width: 1000, height: 500 })
  })
})

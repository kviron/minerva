import { describe, expect, it } from 'vitest'
import {
  clampDataGridColumnSizing,
  defaultDataGridColumnSizing,
  parseDataGridColumnSizing,
} from '../../../../app/shared/data-grid/model/column-sizing'

const columns = [
  { id: 'action', label: 'Действие', size: 280, minSize: 220, maxSize: 520 },
  { id: 'target', label: 'Объект', size: 320, minSize: 220, maxSize: 600 },
] as const

describe('data grid column sizing', () => {
  it('creates deterministic default widths', () => {
    expect(defaultDataGridColumnSizing(columns)).toEqual({ action: 280, target: 320 })
  })

  it('keeps known finite widths inside each column boundary', () => {
    expect(clampDataGridColumnSizing(columns, {
      action: 100,
      target: 900,
      unknown: 400,
    })).toEqual({ action: 220, target: 600 })
  })

  it('rejects malformed persisted preferences', () => {
    expect(parseDataGridColumnSizing(columns, '{"action":360,"target":"wide"}')).toEqual({
      action: 360,
      target: 320,
    })
    expect(parseDataGridColumnSizing(columns, 'not-json')).toEqual({ action: 280, target: 320 })
    expect(parseDataGridColumnSizing(columns, null)).toEqual({ action: 280, target: 320 })
  })
})

import type { ColumnSizingState } from '@tanstack/vue-table'
import type { DataGridColumn } from './types'

type SizableColumn = DataGridColumn<string>

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum)

const isUnknownRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const defaultDataGridColumnSizing = (
  columns: readonly SizableColumn[],
): ColumnSizingState => Object.fromEntries(columns.map(column => [column.id, column.size]))

export const clampDataGridColumnSizing = (
  columns: readonly SizableColumn[],
  sizing: Readonly<Record<string, unknown>>,
): ColumnSizingState => Object.fromEntries(columns.map((column) => {
  const candidate = sizing[column.id]
  const size = typeof candidate === 'number' && Number.isFinite(candidate)
    ? clamp(candidate, column.minSize, column.maxSize)
    : column.size

  return [column.id, size]
}))

export const parseDataGridColumnSizing = (
  columns: readonly SizableColumn[],
  serialized: string | null,
): ColumnSizingState => {
  if (serialized === null)
    return defaultDataGridColumnSizing(columns)

  try {
    const parsed: unknown = JSON.parse(serialized)
    return isUnknownRecord(parsed)
      ? clampDataGridColumnSizing(columns, parsed)
      : defaultDataGridColumnSizing(columns)
  }
  catch {
    return defaultDataGridColumnSizing(columns)
  }
}

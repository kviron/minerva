export type DataGridColumn<TSort extends string> = Readonly<{
  id: string
  label: string
  sort?: TSort
  size: number
  minSize: number
  maxSize: number
}>


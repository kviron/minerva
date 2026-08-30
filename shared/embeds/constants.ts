export const EMBED_PROVIDER = {
  FIGMA: 'figma',
} as const

export type EmbedProvider = typeof EMBED_PROVIDER[keyof typeof EMBED_PROVIDER]

export const EMBED_THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const

export type EmbedTheme = typeof EMBED_THEME[keyof typeof EMBED_THEME]

export const FIGMA_RESOURCE_TYPE = {
  DESIGN: 'design',
  PROTOTYPE: 'proto',
  BOARD: 'board',
  SLIDES: 'slides',
  DECK: 'deck',
} as const

export type FigmaResourceType = typeof FIGMA_RESOURCE_TYPE[keyof typeof FIGMA_RESOURCE_TYPE]

export const FIGMA_EMBED_DEFAULT_HEIGHT = 520
export const FIGMA_EMBED_MIN_HEIGHT = 320
export const FIGMA_EMBED_MAX_HEIGHT = 900
export const FIGMA_EMBED_DEFAULT_WIDTH = 960
export const FIGMA_EMBED_MIN_WIDTH = 320
export const FIGMA_EMBED_MAX_WIDTH = 1600

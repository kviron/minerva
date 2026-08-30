export const publicDocumentRoute = (token: string, documentId?: string): string =>
  `/share/documentation/${encodeURIComponent(token)}${documentId ? `/${encodeURIComponent(documentId)}` : ''}`

export const publicDocumentImageUrl = (token: string, imageId: string): string =>
  `/api/public/documentation/${encodeURIComponent(token)}/images/${encodeURIComponent(imageId)}`

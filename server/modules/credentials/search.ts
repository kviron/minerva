export type SearchableCredential = Readonly<{
  title: string
  login: string | null
  fields: readonly Readonly<{ label: string, value: string }>[]
}>

export const normalizeCredentialSearchQuery = (value: string): string => value.trim().toLocaleLowerCase('ru-RU')

const includesQuery = (value: string, query: string): boolean => value.toLocaleLowerCase('ru-RU').includes(query)

export const matchesCredentialSearch = (query: string, credential: SearchableCredential): boolean => query.length === 0
  || includesQuery(credential.title, query)
  || (credential.login !== null && includesQuery(credential.login, query))
  || credential.fields.some(field => includesQuery(field.label, query) || includesQuery(field.value, query))

export type CredentialCategoryDetails = Readonly<{
  id: string
  name: string
  description: string | null
}>

export type CredentialCategoryListItem = CredentialCategoryDetails & Readonly<{
  position: number
}>

export type CredentialCategory = CredentialCategoryDetails & Readonly<{
  roleIds: readonly string[]
  membershipIds: readonly string[]
}>

export type CredentialCategoryRole = Readonly<{
  id: string
  name: string
  builtInKey: 'admin' | 'editor' | 'viewer' | null
}>

export type CredentialCategoryMember = Readonly<{
  membershipId: string
  userId: string
  name: string
  email: string
}>

export type CredentialCategoryManagement = Readonly<{
  canManage: boolean
  canCreateCategories: boolean
  canCreateCredentials: boolean
  categories: readonly CredentialCategory[]
  roles: readonly CredentialCategoryRole[]
  members: readonly CredentialCategoryMember[]
}>

export type CredentialCategoryBody = Readonly<Pick<CredentialCategoryDetails, 'name' | 'description'>>
export type CredentialCategoryGrantsBody = Readonly<{
  roleIds: readonly string[]
  membershipIds: readonly string[]
}>
export type CredentialCategoryIdResponse = Readonly<{ categoryId: string }>
export type CredentialCategoryMutationResponse = Readonly<{ ok: true }>

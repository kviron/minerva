type ValueOf<T> = T[keyof T]

export type AccountStatus = ValueOf<typeof import('./constants').ACCOUNT_STATUS>
export type AuthMode = ValueOf<typeof import('./constants').AUTH_MODE>
export type IdentityCode = ValueOf<typeof import('./constants').IDENTITY_CODE>
export type LoginIdentifierKind = ValueOf<typeof import('./constants').LOGIN_IDENTIFIER_KIND>

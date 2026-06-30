type ValueOf<T> = T[keyof T]

export type AuthorizationCode = ValueOf<typeof import('./constants').AUTHORIZATION_CODE>

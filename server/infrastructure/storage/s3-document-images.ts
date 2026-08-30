import {
  createS3PrivateObjectStorage,
  type PrivateObject,
  type PrivateObjectStorage,
} from './s3-private-objects'

export type DocumentImageObject = PrivateObject
export type DocumentImageStorage = PrivateObjectStorage
export const createS3DocumentImageStorage = createS3PrivateObjectStorage

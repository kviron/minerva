import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getObjectStorageEnv } from '../../../shared/config/env'

export interface DocumentImageObject {
  readonly bytes: Buffer
  readonly mimeType: string
}

export interface DocumentImageStorage {
  readonly put: (objectKey: string, bytes: Buffer, mimeType: string) => Promise<void>
  readonly get: (objectKey: string) => Promise<DocumentImageObject | null>
  readonly remove: (objectKey: string) => Promise<void>
}

let bucketReady: Promise<void> | null = null

export const createS3DocumentImageStorage = (): DocumentImageStorage => {
  const env = getObjectStorageEnv()
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  })

  const ensureBucket = (): Promise<void> => {
    if (bucketReady === null) {
      bucketReady = client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))
        .then(() => undefined)
        .catch(async () => {
          await client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }))
        })
    }
    return bucketReady
  }

  return {
    async put(objectKey, bytes, mimeType) {
      await ensureBucket()
      await client.send(new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: objectKey,
        Body: bytes,
        ContentType: mimeType,
        CacheControl: 'private, no-store',
      }))
    },
    async get(objectKey) {
      await ensureBucket()
      try {
        const response = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: objectKey }))
        if (!response.Body) return null
        return {
          bytes: Buffer.from(await response.Body.transformToByteArray()),
          mimeType: response.ContentType ?? 'application/octet-stream',
        }
      }
      catch (error: unknown) {
        const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : null
        if (name === 'NoSuchKey' || name === 'NotFound') return null
        throw error
      }
    },
    async remove(objectKey) {
      await ensureBucket()
      await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: objectKey }))
    },
  }
}

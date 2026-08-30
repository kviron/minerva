import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ObjectStorageEnv } from '../../../shared/config/env'
import { checkObjectStorage } from '../../../server/infrastructure/storage/health'

const storage: ObjectStorageEnv = {
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'minerva-private',
  S3_ACCESS_KEY_ID: 'minerva',
  S3_SECRET_ACCESS_KEY: 'minerva-development-secret',
  S3_FORCE_PATH_STYLE: true,
}

beforeAll(async () => {
  const client = new S3Client({
    endpoint: storage.S3_ENDPOINT,
    region: storage.S3_REGION,
    forcePathStyle: storage.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: storage.S3_ACCESS_KEY_ID,
      secretAccessKey: storage.S3_SECRET_ACCESS_KEY,
    },
  })
  try {
    await client.send(new CreateBucketCommand({ Bucket: storage.S3_BUCKET }))
  }
  catch (error: unknown) {
    const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : null
    if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') throw error
  }
  finally {
    client.destroy()
  }
})

describe('object storage health', () => {
  it('reports a reachable configured private bucket without creating objects', async () => {
    await expect(checkObjectStorage(storage)).resolves.toBeUndefined()
  })

  it('fails when the configured bucket is unavailable', async () => {
    await expect(checkObjectStorage({ ...storage, S3_BUCKET: 'missing-minerva-private' })).rejects.toThrow()
  })
})

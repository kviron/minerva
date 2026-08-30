import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import type { ObjectStorageEnv } from '../../../shared/config/env'

export const checkObjectStorage = async (env: ObjectStorageEnv, timeoutMs = 3_000): Promise<void> => {
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  })

  try {
    await client.send(
      new HeadBucketCommand({ Bucket: env.S3_BUCKET }),
      { abortSignal: AbortSignal.timeout(timeoutMs) },
    )
  }
  finally {
    client.destroy()
  }
}


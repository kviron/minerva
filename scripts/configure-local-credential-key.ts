import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env')
const source = await readFile(envPath, 'utf8').catch(() => '')
const hasActiveVersion = /^CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION=/mu.test(source)
const hasKeys = /^CREDENTIAL_ENCRYPTION_KEYS=/mu.test(source)

if (hasActiveVersion !== hasKeys) {
  throw new Error('Credential encryption configuration is partial; refusing to replace existing key material')
}

if (hasActiveVersion && hasKeys) {
  console.log('Local credential encryption key is already configured')
  process.exit(0)
}

const separator = source.length === 0 || source.endsWith('\n') ? '' : '\n'
const addition = [
  'CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION=1',
  `CREDENTIAL_ENCRYPTION_KEYS=1:${randomBytes(32).toString('base64')}`,
  '',
].join('\n')

await writeFile(envPath, `${source}${separator}${addition}`, { encoding: 'utf8', mode: 0o600 })
console.log('Local credential encryption key configured without printing key material')

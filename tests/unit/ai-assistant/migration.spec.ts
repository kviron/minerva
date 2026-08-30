import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('project AI connection migration', () => {
  it('creates bounded encrypted storage without parameter placeholders', async () => {
    const migration = await readFile('drizzle/0014_heavy_silver_samurai.sql', 'utf8')

    expect(migration).toContain('CREATE TABLE "project_ai_connections"')
    expect(migration).toContain('"api_key_ciphertext" text NOT NULL')
    expect(migration).toContain('"api_key_nonce" text NOT NULL')
    expect(migration).toContain('"api_key_key_version" integer NOT NULL')
    expect(migration).not.toMatch(/\$\d+/u)
  })
})

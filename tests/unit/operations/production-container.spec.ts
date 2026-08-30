import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(path, 'utf8')

describe('production application image', () => {
  it('uses a frozen multi-stage Bun build and an unprivileged runtime', async () => {
    const dockerfile = await read('Dockerfile')

    expect(dockerfile.match(/^FROM /gmu)).toHaveLength(3)
    expect(dockerfile).toContain('bun install --frozen-lockfile')
    expect(dockerfile).toContain('node node_modules/nuxt/bin/nuxt.mjs build')
    expect(dockerfile).toContain('USER bun')
    expect(dockerfile).toContain('STOPSIGNAL SIGTERM')
    expect(dockerfile).toContain('HEALTHCHECK')
    expect(dockerfile).toContain('CMD ["bun", ".output/server/index.mjs"]')
    expect(dockerfile).not.toMatch(/COPY\s+\.\s+\./u)
  })

  it('excludes secrets, local state, uploads, backups, and generated indexes', async () => {
    const ignore = await read('.dockerignore')
    const gitignore = await read('.gitignore')

    for (const entry of ['.env', '.git', '.tesserae', '.codex', 'node_modules', '.output', 'uploads', 'backups']) {
      expect(ignore).toContain(entry)
    }
    for (const entry of ['secrets/', 'uploads/', 'backups/', '.tesserae/']) {
      expect(gitignore).toContain(entry)
    }
  })
})

describe('production Compose boundary', () => {
  it('contains only the approved runtime services and gates the app on migration', async () => {
    const compose = await read('compose.production.yml')

    for (const service of ['caddy:', 'migrate:', 'app:', 'postgres:']) {
      expect(compose).toContain(service)
    }
    expect(compose).not.toMatch(/^\s{2}(mailpit|minio|postgres-test):/mu)
    expect(compose).toMatch(/migrate:\s*\n[\s\S]*?restart:\s*["']?no["']?/u)
    expect(compose).toMatch(/app:\s*\n[\s\S]*?migrate:\s*\n\s+condition:\s+service_completed_successfully/u)
  })

  it('publishes only Caddy and hardens the application containers', async () => {
    const compose = await read('compose.production.yml')

    expect(compose).toContain('- "80:80"')
    expect(compose).toContain('- "443:443"')
    expect(compose.match(/^\s+ports:/gmu)).toHaveLength(1)
    expect(compose).toContain('read_only: true')
    expect(compose).toContain('no-new-privileges:true')
    expect(compose).toContain('cap_drop:')
    expect(compose).toContain('- ALL')
    expect(compose).toContain('tmpfs:')
    expect(compose).toContain('internal: true')
  })

  it('mounts secrets as files and applies bounded operations policies', async () => {
    const compose = await read('compose.production.yml')

    expect(compose).toContain('DATABASE_URL_FILE: /run/secrets/database_url')
    expect(compose).toContain('BETTER_AUTH_SECRET_FILE: /run/secrets/better_auth_secret')
    expect(compose).toContain('POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password')
    expect(compose).toContain('restart: unless-stopped')
    expect(compose).toContain('max-size: "10m"')
    expect(compose).toContain('max-file: "5"')
    expect(compose).toContain('resources:')
  })
})

describe('production Caddy boundary', () => {
  it('uses automatic HTTPS, proxies only to the app, and disables access logs', async () => {
    const caddyfile = await read('deploy/Caddyfile')

    expect(caddyfile).toContain('{$MINERVA_DOMAIN}')
    expect(caddyfile).toContain('reverse_proxy app:3000')
    expect(caddyfile).not.toMatch(/^\s*log\s*(\{|$)/mu)
    expect(caddyfile).not.toContain('http://')
  })
})

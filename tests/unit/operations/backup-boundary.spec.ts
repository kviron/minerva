import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(path, 'utf8')

describe('production backup boundary', () => {
  it('uses version-matched custom pg_dump, checksum manifest, restic retention, and cleanup', async () => {
    const dockerfile = await read('deploy/backup/Dockerfile')
    const backup = await read('deploy/backup/backup.sh')

    expect(dockerfile).toContain('postgres:17.5-alpine')
    expect(dockerfile).toContain('restic/restic:0.18.0')
    expect(backup).toContain('pg_dump --format=custom')
    expect(backup).toContain('sha256sum')
    expect(backup).toContain('restic backup')
    expect(backup).toContain('--stdin-filename minerva-backup.tar')
    expect(await read('deploy/backup/lib.sh')).toContain('RESTIC_CACHE_DIR')
    expect(backup).toContain('--keep-daily 7')
    expect(backup).toContain('--keep-weekly 4')
    expect(backup).toContain('--keep-monthly 6')
    expect(backup).toContain("trap 'rm -rf")
    expect(backup).not.toMatch(/set -x|echo .*PASSWORD|echo .*SECRET/iu)
    expect(backup).toContain("echo 'Backup repository is unavailable'")
    expect(await read('deploy/backup/check.sh')).toContain('{"status":"unavailable"}')
    expect(await read('deploy/backup/freshness.sh')).toContain('max_by(.time).time')
  })

  it('adds one-shot profile jobs with distinct secrets, private networking, and no Docker socket', async () => {
    const compose = await read('compose.production.yml')

    expect(compose).toMatch(/backup:\s*\n[\s\S]*?profiles:\s*\[backup\]/u)
    expect(compose).toMatch(/backup-check:\s*\n[\s\S]*?profiles:\s*\[backup-check\]/u)
    expect(compose).toContain('restic_password')
    expect(compose).toContain('backup_repository')
    expect(compose).not.toContain('/var/run/docker.sock')
  })

  it('preflights repository, disk, release identity, secret permissions, and bucket versioning', async () => {
    const containerPreflight = await read('deploy/backup/preflight.sh')
    const hostPreflight = await read('deploy/production-preflight.sh')

    expect(containerPreflight).toContain('restic cat config')
    expect(containerPreflight).toContain('get-bucket-versioning')
    expect(containerPreflight).toContain('BACKUP_MIN_FREE_KIB')
    expect(hostPreflight).toContain("stat -c '%a'")
    expect(hostPreflight).toContain('backup-preflight')
    expect(hostPreflight).not.toContain('docker.sock')
  })

  it('defines persistent daily backup and weekly check timers with a shared lock', async () => {
    const backupService = await read('deploy/systemd/minerva-backup.service')
    const backupTimer = await read('deploy/systemd/minerva-backup.timer')
    const checkService = await read('deploy/systemd/minerva-backup-check.service')
    const checkTimer = await read('deploy/systemd/minerva-backup-check.timer')

    expect(backupService).toContain('flock --nonblock /run/lock/minerva-backup.lock')
    expect(checkService).toContain('flock --nonblock /run/lock/minerva-backup.lock')
    expect(backupTimer).toContain('OnCalendar=daily')
    expect(checkTimer).toContain('OnCalendar=weekly')
    expect(backupTimer).toContain('Persistent=true')
    expect(checkTimer).toContain('Persistent=true')
  })

  it('restores only into the isolated graph and fails on checksum, object, or key gaps', async () => {
    const restoreCompose = await read('compose.restore.yml')
    const restore = await read('deploy/backup/restore.sh')

    expect(restoreCompose).toContain('name: minerva-restore')
    expect(restoreCompose).not.toMatch(/^\s+ports:/mu)
    expect(restore).toContain('sha256sum -c -')
    expect(restore).toContain('--include /minerva-backup.tar')
    expect(restore).toContain('pg_restore')
    expect(restore).toContain('verify-database')
    expect(restore).toContain("snapshot_id=\"${RESTORE_SNAPSHOT_ID:?Restore snapshot is required}\"")
    expect(restore).toContain("if [ \"$snapshot_id\" = 'latest' ]")
    expect(restore).toContain('Restore requires an explicit snapshot identity')
    expect(restore).toContain('verify-object-inventory')
    expect(restore).toContain('verify-key-versions')
    expect(restore).not.toContain('docker.sock')
  })
})

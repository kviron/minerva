# Encrypted backup and isolated restore

Status: PR.4 tooling implemented; real off-host restore drill pending
Date: 2026-08-06

## What counts as a recoverable backup

A Minerva database dump alone is not a recoverable backup. Recovery requires:

1. the encrypted restic snapshot containing `minerva.dump` and `manifest.json`;
2. the retained/versioned object-store recovery copy;
3. every separately escrowed `CREDENTIAL_ENCRYPTION_KEYS` version referenced by
   credentials, AI connections, and public-share records;
4. the immutable application image digest named by the manifest.

The key escrow must not be stored in PostgreSQL or in the same restic
repository. Backup and object-audit credentials must be distinct from runtime
application credentials. No backup or restore container mounts the Docker
socket.

## One-time production setup

Create `/etc/minerva/secrets` outside the checkout with owner-readable files
and mode `0400`, `0600`, or deliberately group-readable `0640`:

- existing application and PostgreSQL secret files;
- `backup_repository` and `restic_password`;
- `backup_access_key_id` and `backup_secret_access_key` for the off-host restic
  repository;
- `object_audit_access_key_id` and `object_audit_secret_access_key` with only
  bucket-versioning/read-policy access.

The external object bucket must have versioning enabled and an independently
tested replication or backup policy. The restic backend must be outside the
VPS failure domain and should enforce provider-side retention/immutability.

Initialize a new repository exactly once:

```sh
docker compose --env-file /etc/minerva/production.env \
  -f compose.production.yml --profile backup run --rm --no-deps \
  -e INITIALIZE_REPOSITORY=yes backup /opt/minerva/init.sh
```

Run `deploy/production-preflight.sh`, then install the four units from
`deploy/systemd/`, execute `systemctl daemon-reload`, and enable both timers:

```sh
systemctl enable --now minerva-backup.timer minerva-backup-check.timer
systemctl list-timers 'minerva-backup*'
```

Both timers are persistent after missed runs and share a non-blocking host lock.
The backup retains 7 daily, 4 weekly, and 6 monthly snapshots. Weekly check runs
`restic check` and emits one machine-readable freshness result. Any non-zero
service exit, `stale`, `missing`, or `invalid` result is an alert.

## Manual backup and verification

```sh
docker compose --env-file /etc/minerva/production.env \
  -f compose.production.yml --profile backup run --rm backup
docker compose --env-file /etc/minerva/production.env \
  -f compose.production.yml --profile backup-check run --rm backup-check
```

Success is reported only after custom-format `pg_dump`, SHA-256 manifest,
encrypted restic snapshot, retention, and pruning succeed. Plaintext staging is
tmpfs-backed and removed by a trap on success, failure, or termination.

## Isolated restore drill

Never point `compose.restore.yml` at production PostgreSQL or the live object
bucket. Prepare `/etc/minerva/restore.env` and `/etc/minerva/secrets/restore/`
with a clean target database URL, recovered object-copy credentials, and a copy
of the separately escrowed key ring. Select an explicit snapshot ID, not
`latest`.

```sh
docker compose --env-file /etc/minerva/restore.env \
  -f compose.restore.yml up --build --abort-on-container-exit \
  --exit-code-from restore restore
```

The restore job verifies the strict manifest and dump checksum before replacing
the isolated public schema. It then verifies expected database families,
referenced key versions, and every document-image/project-icon object using
content-free probes. Any missing component fails the drill.

After the restore job succeeds, start the manifest's application image against
the isolated database and recovered object copy. Verify with a designated
recovery-test account: sign-in, one escrowed synthetic credential reveal,
project icon and document image reads, immutable version reads, a public share,
OAuth/MCP metadata, and audit browsing. Never reveal or record a real user
credential value as drill evidence.

## Required failure simulations

Perform these only against disposable copies:

- create a disposable restic snapshot containing a modified dump and the old
  manifest; checksum verification must fail before `pg_restore`;
- remove one referenced object from the disposable recovery bucket; object
  inventory verification must fail without printing its key;
- remove one referenced version from the copied escrow ring; key inventory
  verification must fail without printing the version or key;
- use an unreachable repository endpoint; backup/check/restore must exit
  non-zero without exposing credentials.

Record each result in `docs/operations/restore-drill-record-template.md`.
Finally destroy the isolated stack and plaintext staging:

```sh
docker compose --env-file /etc/minerva/restore.env \
  -f compose.restore.yml down --volumes --remove-orphans
```

Do not mark PR.4 or a production release complete until the external repository
survives a simulated VPS loss, the full drill passes within RTO 4 hours, the
latest retained snapshot is within RPO 24 hours, and the evidence record is
reviewed without secrets or raw storage paths.

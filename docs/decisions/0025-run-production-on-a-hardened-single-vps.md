# ADR 0025: Run production on a hardened single VPS with off-host recovery

Date: 2026-08-04  
Status: accepted  
Accepted: 2026-08-04

## Context

Minerva is a modular monolith intended to run on one VPS for the first release.
The repository currently has a development-only Compose file with PostgreSQL,
Mailpit, and MinIO, but no application image, TLS endpoint, production secret
boundary, migration job, backup automation, restore drill, or release gate.

The application stores business state in PostgreSQL, private objects in an
S3-compatible bucket, and several independent encryption keys outside the
database. A database-only backup is therefore not a recoverable Minerva backup.
Public document capability URLs, credentials, OAuth tokens, session cookies,
AI keys, object paths, and database URLs also require explicit log redaction.

## Decision

- The first production topology is one Linux VPS running Docker Compose with
  Caddy, one Minerva application container, one one-shot migration container,
  and PostgreSQL 17. Only Caddy publishes host ports 80 and 443.
- Production uses a separate `compose.production.yml` rather than inheriting
  development services and passwords. Mailpit and the test database never
  exist in the production graph.
- Caddy terminates TLS, redirects HTTP to HTTPS, forwards only to the internal
  application network, and is the sole trusted proxy. The application port and
  PostgreSQL are not host-published.
- The application image is reproducible, multi-stage, built from the frozen Bun
  lockfile, runs the existing Nitro Bun preset as an unprivileged user, drops
  Linux capabilities, uses a read-only root filesystem and bounded temporary
  filesystems, and contains no build credentials or source `.env` file.
- Runtime secrets are mounted per service as Compose secret files. Minerva adds
  an explicit `_FILE` configuration boundary and fails before accepting traffic
  when a required secret is absent, malformed, duplicated, or insecure.
- Database migrations run once from the exact application image before the app
  becomes ready. A failed migration blocks deployment. Destructive schema
  changes require a separate accepted ADR and tested backup/rollback procedure.
- Production object storage is an independent S3-compatible service with
  versioning enabled. Bundled single-node MinIO remains a development option,
  not the default production durability boundary; hosting objects on the same
  VPS would share the same failure domain as PostgreSQL and the application.
- PostgreSQL receives daily custom-format `pg_dump` snapshots encrypted by
  restic and written to independent off-host storage. Retention starts at seven
  daily, four weekly, and six monthly snapshots. `restic check` runs weekly.
- Host `systemd` timers invoke one-shot backup and repository-check Compose
  profiles. Backup containers never receive the Docker socket and do not remain
  running between jobs.
- Object recovery relies on bucket versioning plus a second-location replication
  or backup policy. The release cannot be called production-ready until an
  isolated drill restores the database, required object versions, and every
  referenced encryption-key version and verifies application behavior.
- Initial recovery objectives are RPO 24 hours and RTO 4 hours. PostgreSQL PITR
  is deferred until data volume or business requirements demand a smaller RPO.
- Application logs are structured JSON with generated request IDs and a closed
  redaction policy. Raw authorization/cookie headers, request bodies, database
  and S3 credentials, document content, credential values, and public-share
  capability path segments are never logged. Proxy request access logging stays
  disabled until equivalent path/header redaction is proven.
- Liveness checks process health only. Readiness checks PostgreSQL, required
  configuration, and object storage through content-free bounded probes.
- The release gate includes dependency and container scanning, a rendered
  Compose validation, migration verification, full automated tests, a restore
  drill record, backup freshness, and operator rollback instructions.

## Consequences

- One VPS remains economical and understandable, but it is not highly
  available. Hardware or host failure causes downtime until restore or VPS
  replacement.
- External object and backup storage add operational dependencies but remove the
  most dangerous shared failure domain.
- Daily logical dumps provide a portable, internally consistent database
  snapshot without introducing WAL/PITR complexity. They cannot meet an RPO
  below 24 hours.
- Secret files require a small configuration refactor before the production
  graph can start; secrets still exist in application memory while used.
- Automatic schema rollback is intentionally absent. Releases use forward
  compatible additive migrations and application rollback only when the prior
  image remains compatible.

## Alternatives rejected

- **Reuse the development Compose file:** risks shipping development passwords,
  Mailpit, host-published database ports, and test services.
- **Run MinIO on the same VPS as the only object copy:** one disk or host loss
  removes both database and private files.
- **Store production secrets in `.env`:** broad process/environment visibility
  and accidental diagnostic exposure are weaker than per-service secret mounts.
- **Back up raw live PostgreSQL volume files:** unsafe without the required
  filesystem snapshot or continuous-archiving protocol and less portable than
  `pg_dump` for the initial scale.
- **Enable PITR immediately:** improves RPO but materially increases setup,
  monitoring, retention, and restore complexity before an RPO below 24 hours is
  required.
- **Log all proxy requests:** public-share capabilities live in URL paths and
  would become bearer-secret log records without proven redaction.

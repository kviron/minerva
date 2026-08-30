# Production readiness: audited design

Status: approved by the user on 2026-08-04  
Date: 2026-08-04

## Goal

Deploy Minerva reproducibly to a clean Linux VPS, expose only HTTPS, keep
runtime secrets and private services off the public interface, recover both
database and objects from independent backups, and make a release decision from
repeatable evidence rather than operator memory.

## Audited baseline

The repository already has a healthy development foundation: pinned PostgreSQL
17 and MinIO images, database health probing, strict environment validation,
Drizzle migrations, an ignored `.env`, a frozen Bun lockfile, production builds,
authorization-aware audit events, and security-specific MCP/public-sharing
runbooks.

The current `docker-compose.yml` is intentionally not deployable as production:

1. it has no application, migration, proxy, backup, or restore services;
2. PostgreSQL and MinIO use checked-in development credentials;
3. PostgreSQL, MinIO, and the MinIO console publish loopback host ports;
4. Mailpit and the test profile belong only to development;
5. only PostgreSQL has a healthcheck and the public health API checks only the
   database;
6. secrets are accepted only as environment values, not scoped secret files;
7. no request-wide structured/redacted logging boundary exists;
8. security headers contain only `frame-src` and `object-src` directives;
9. there is no CI/release pipeline or dependency/container scan;
10. there is no backup freshness signal, retention job, or restore evidence.

## Target topology

```text
Internet
   |
   v
Caddy :80/:443  -- automatic TLS, HTTPS redirect, HSTS
   |
   v
Minerva app :3000 (internal network only)
   |                         |
   v                         v
PostgreSQL 17          external versioned S3
(private volume)       (private objects)
   |
   v
scheduled pg_dump -> restic encryption -> independent off-host repository
```

`migrate` uses the same immutable Minerva image, runs Drizzle once, exits, and
must succeed before `app` starts. Caddy starts independently but returns an
upstream failure until application readiness; deployments verify readiness
before switching a release to healthy.

Docker explicitly recommends production-specific Compose configuration,
different ports/environment, restart policies, and immutable application code
([Docker production guidance](https://docs.docker.com/compose/how-tos/production/)).
Compose secrets are service-scoped files and reduce accidental environment/log
exposure ([Docker secrets guidance](https://docs.docker.com/compose/how-tos/use-secrets/)).

## Runtime and container boundary

- Pin base images by immutable version and record resolved digests in release
  evidence. Automated update proposals may advance them; production never uses
  `latest`.
- Build with `bun install --frozen-lockfile`, run `nuxt build`, and copy only
  `.output` plus runtime requirements into the final image.
- Run as a numeric non-root UID/GID with `cap_drop: [ALL]`,
  `security_opt: [no-new-privileges:true]`, `read_only: true`, and bounded
  `/tmp`/runtime `tmpfs` mounts.
- Set resource and log rotation limits. Database storage and Caddy certificate
  data are named persistent volumes; application containers are disposable.
- Preserve the existing Bun package/runtime choice for the approved MVP. A
  switch to the Nuxt-documented Node server preset is a separate compatibility
  decision, not part of production hardening. Nuxt still recommends running the
  production server behind a TLS-terminating reverse proxy
  ([Nuxt deployment](https://nuxt.com/docs/4.x/getting-started/deployment)).

## Configuration and secrets

Non-secret deployment values live in a reviewed production example file:
canonical HTTPS application/OAuth/MCP URLs, trusted origin, SMTP host/port,
S3 endpoint/region/bucket, proxy policy, locale, and operational limits.

Secret files are created outside the repository with restrictive permissions:

- PostgreSQL application and backup credentials;
- Better Auth and rate-limit HMAC secrets;
- credential, AI-connection, and public-share encryption key rings;
- SMTP credential;
- S3 access key and secret;
- restic repository password and repository credentials.

The application accepts each through one explicit `<NAME>_FILE` field, rejects
simultaneous value/file definitions, reads a bounded UTF-8 file, trims only the
documented trailing line ending, and validates the resulting value through the
existing Zod contracts. Secret values never enter configuration error messages.
Encryption key rings are backed up separately from both PostgreSQL and the
restic repository; a database restore without all referenced key versions is a
failed restore.

## Network and proxy trust

- Only Caddy joins the public network. App, migration, PostgreSQL, and backup
  services use private networks and expose no host ports.
- Caddy is the only direct peer of the app. `TRUST_PROXY=true` is permitted only
  in this topology; direct host publication of the app port is forbidden.
- Caddy ignores client-supplied forwarded values and creates its own forwarding
  headers. Its default behavior protects against spoofed `X-Forwarded-*` input
  when it is the first proxy ([Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)).
- Caddy manages certificate issuance/renewal and HTTP-to-HTTPS redirects through
  automatic HTTPS ([Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)).
- Canonical Better Auth and MCP URLs are configuration, never derived from
  `Host` or forwarding headers.

## Health and deployment lifecycle

Add two content-free endpoints:

- `/api/health/live`: process is running; no dependency query;
- `/api/health/ready`: bounded PostgreSQL query, S3 bucket/head probe, required
  runtime configuration initialized, and no pending migration mismatch.

Neither endpoint returns connection strings, bucket names, versions, stack
traces, or component-specific failure details publicly. Operators obtain the
component reason from redacted internal logs.

Deployment sequence:

1. validate rendered Compose and required secret-file permissions;
2. fetch/build the immutable image and record its digest;
3. prove a fresh off-host backup and repository check;
4. run the one-shot migration container;
5. start/recreate the app and wait for readiness;
6. run public smoke checks for HTTPS, auth, public sharing, and MCP metadata;
7. retain the previous compatible image for rollback;
8. record release, migration, backup, and smoke-test evidence.

## Security headers

The app owns route-aware CSP because it knows which Figma and API connections
are valid. Caddy owns transport headers. The baseline includes:

- HSTS after HTTPS/domain validation;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy` (public capability pages remain `no-referrer`);
- clickjacking protection through CSP `frame-ancestors 'none'`;
- CSP defaults for scripts, styles, images, fonts, connections, forms, objects,
  bases, and the allow-listed Figma frame origins;
- no server/version disclosure headers.

Header tests cover authenticated pages, auth/OAuth endpoints, MCP, public
capability pages, images, and errors. Header tightening must preserve Nuxt SPA
assets, SSE assistant streams, private images, and allow-listed Figma embeds.

## Logs, audit, and monitoring

Application request logs are one-line JSON with timestamp, severity, request
ID, method, normalized route template, status, duration, and safe actor/channel
identifiers only when already authenticated. They exclude bodies and sensitive
headers. Public documentation route templates replace the capability with
`[redacted]` before logging.

Docker logs use bounded rotation. Initial alerts are operationally simple:
readiness failure, restart loop, disk threshold, backup age, backup/check
failure, certificate renewal failure, elevated 5xx, and repeated auth/rate-limit
failures. Metrics exporters are deferred until these signals prove insufficient.

The existing append-only `audit_events` table receives a read-only,
cursor-paginated super-administration browser. It exposes a safe contract:
timestamp, channel, action, outcome, safe actor/project labels, target type/ID,
and an allow-listed metadata projection. Raw JSON metadata is never sent to the
browser. Authorization uses `requireSuperAdmin`, not navigation visibility.

## Backup and recovery

PostgreSQL documents that `pg_dump` creates an internally consistent snapshot
without blocking ordinary operations and that custom format supports selective
and parallel `pg_restore`
([PostgreSQL SQL dumps](https://www.postgresql.org/docs/current/backup-dump.html)).
The initial job therefore:

1. runs `pg_dump --format=custom` from a version-matched PostgreSQL image;
2. emits a content-free manifest with schema migration identity, timestamp,
   app image digest, and dump checksum;
3. sends the dump and manifest to an encrypted restic repository;
4. applies `7 daily / 4 weekly / 6 monthly` retention;
5. runs a weekly repository check (restic recommends regular checks:
   [restic backup guidance](https://restic.readthedocs.io/en/stable/040_backup.html));
6. reports success only after snapshot and retention complete.

Host `systemd` timers invoke one-shot `backup` and `backup-check` Compose
profiles. The jobs never mount the Docker socket, do not remain resident between
runs, and use credentials distinct from the application. Timer installation,
missed-run behavior, concurrency locking, and alerting are part of the deploy
runbook.

The S3 bucket must have versioning and an independent second-location recovery
policy. Backup credentials are write-limited where the provider permits and are
different from application credentials.

At least once per release candidate and monthly in operation, restore into an
isolated environment:

- restore a selected database dump into a clean PostgreSQL instance;
- restore/attach the object-store recovery copy at the corresponding retained
  versions;
- supply the separately escrowed encryption keys;
- run migrations only if the selected application release requires them;
- verify sign-in, credential decryption, project icons, document images,
  immutable versions, public shares, OAuth/MCP metadata, and audit readability;
- record duration, selected snapshot, checksums, missing objects, and outcome;
- destroy the isolated restored environment and any plaintext staging data.

## Release verification

The release candidate must pass:

- frozen dependency install, unit/integration/E2E, typecheck, production build,
  and Drizzle validation;
- Dockerfile build and non-root/read-only runtime tests;
- rendered Compose policy tests (published ports, secrets, capabilities,
  healthchecks, restart/resource/log limits);
- dependency, secret, SBOM, and container vulnerability scans with an explicit
  severity policy and documented exceptions;
- TLS/header/cookie/proxy-spoofing and capability-log-redaction tests;
- migration on a restored production-shaped dataset;
- backup freshness plus a successful timed restore drill;
- smoke checks and a signed release checklist.

## Deferred

- multi-node high availability and zero-downtime database failover;
- PostgreSQL WAL/PITR and RPO below 24 hours;
- Kubernetes/Swarm;
- bundled production MinIO on the same VPS;
- full observability stack, distributed tracing, and long-term log aggregation;
- automatic destructive database rollback.

## Approval decisions

Approval accepts:

1. a hardened single-VPS topology with expected downtime on host failure;
2. Caddy as the only public endpoint and trusted proxy;
3. external versioned S3-compatible storage rather than same-VPS MinIO as the
   default production object boundary;
4. daily encrypted off-host PostgreSQL dumps with initial RPO 24h/RTO 4h and no
   PITR;
5. Compose secret files and a fail-closed `_FILE` configuration boundary;
6. disabled proxy request access logs until capability/header redaction is
   proven;
7. a super-admin-only safe audit browser;
8. implementation in the vertical slices of the accompanying plan.

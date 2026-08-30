# Production readiness implementation plan

Status: approved; Slices PR.1-PR.3 and PR.5 complete; PR.4 external drill and PR.6 remain  
Date: 2026-08-04

## Preconditions

- Accept ADR 0025, the audited design, recovery objectives, and object-storage
  boundary.
- Keep production and development Compose graphs independent.
- Implement each slice tests first and update `docs/progress.md` after it passes.
- Never add real secrets, backups, restore artifacts, image layers, `.env`
  files, or generated scan indexes to Git or Tesserae.

## Slice PR.1: production configuration and health boundary

Status: completed 2026-08-04.

1. Add failing unit tests for bounded `_FILE` secret loading, value/file
   conflicts, missing files, line-ending handling, and content-free failures.
2. Split validated public configuration from secret configuration without
   weakening existing local/test inputs.
3. Add liveness and readiness application services and endpoints with bounded
   PostgreSQL/S3 checks and neutral public results.
4. Test startup failure, dependency timeout, no-detail output, and unchanged
   authorization classification.

Acceptance: one production-shaped process can initialize only from complete
validated configuration and reports content-free liveness/readiness.

## Slice PR.2: immutable application image and production Compose

Status: completed 2026-08-04.

1. Add source tests for a multi-stage frozen Bun build, non-root final image,
   minimal copied output, and `.dockerignore` secret/artifact exclusions.
2. Build and smoke-test the image with read-only root, dropped capabilities,
   no-new-privileges, tmpfs, stop signals, and healthcheck.
3. Add standalone `compose.production.yml` with Caddy, migrate, app, PostgreSQL,
   secret mounts, private networks, persistent volumes, restart/log/resource
   policies, and no development services.
4. Add Caddy automatic HTTPS/reverse-proxy configuration without raw request
   access logging and test rendered Compose for forbidden ports/settings.
5. Prove migration success gates app start and migration failure blocks it.

Acceptance: a clean Linux host can start an immutable production graph where
only Caddy is public and the app becomes ready after migration.

## Slice PR.3: transport security and structured logging

Status: completed 2026-08-05.

1. Add route-matrix tests for CSP, HSTS ownership, no-sniff, referrer policy,
   frame ancestors, cookies, errors, images, SSE, MCP, OAuth, and public shares.
2. Add request-ID propagation/generation and one structured logger with closed
   fields and route-template/capability redaction.
3. Prove canary secrets, headers, bodies, URLs, content, and storage paths never
   enter logs under success, validation error, authorization denial, provider
   failure, and unhandled error paths.
4. Add bounded Docker log rotation and operator alert conditions.

Acceptance: HTTPS/browser controls hold on every boundary and production logs
are useful without becoming a second secret store.

## Slice PR.4: encrypted off-host backup and restore drill

Status: tooling and local failure matrix completed 2026-08-08; external timed drill pending.

1. Add testable backup scripts that use version-matched `pg_dump --format=custom`,
   checksum a manifest, write through restic, enforce retention, and clean
   staging data on success/failure.
2. Add preflight checks for repository reachability, free disk, required secret
   files, bucket versioning/recovery policy, and application image identity.
3. Add weekly restic integrity checks and a machine-readable backup freshness
   status without secret values.
4. Write an isolated restore command/runbook that restores PostgreSQL, objects,
   and escrowed key rings, then runs deterministic verification probes.
5. Execute and record a timed full drill against production-shaped containers;
   simulate missing object, missing key, corrupt dump, and unavailable backup.

Acceptance: loss of the VPS can be recovered from independent storage within
RTO 4h with at most RPO 24h, and incomplete recovery fails visibly.

## Slice PR.5: safe audit browsing

Status: completed 2026-08-22.

1. Add strict shared cursor/filter/response contracts and pure safe metadata
   projection tests.
2. Add a read-only service guarded by active `super_admin`, stable ordering, and
   bounded cursor pagination; inaccessible access is indistinguishable from the
   existing administration boundary.
3. Add no-store Nitro endpoint and a Russian-first administration table using
   existing shadcn-vue Table, filters, Badge, Skeleton, and Empty primitives.
4. Test raw metadata, secrets, content, deleted/disabled actors, pagination,
   concurrency, and audit-read attribution.

Acceptance: a super administrator can investigate safe audit events without
receiving raw event metadata or changing audit history.

## Slice PR.6: release automation and clean-VPS acceptance

1. Add CI jobs for frozen install, full tests, typecheck, build, migration
   validation, rendered Compose policy, image build, SBOM, secret scan,
   dependency scan, and container scan.
2. Define severity/exception policy and ensure reports contain no secrets or
   private fixtures.
3. Add release preflight and smoke scripts for DNS/TLS, readiness, sign-in,
   public documentation, image access, OAuth discovery, and MCP metadata.
4. Deploy to a clean production-shaped VPS, run migrations and smoke checks,
   verify external ports and proxy spoofing, execute a backup and restore drill,
   and record measured RPO/RTO.
5. Complete operator runbooks for deploy, rollback, secret/key rotation,
   certificate incidents, backup failure, restore, disk pressure, and account/
   OAuth/public-share incidents.
6. Update product spec, architecture, roadmap, and progress only after every
   release gate passes.

Acceptance: a clean VPS deployment and documented restore test succeed, and a
release can be repeated from reviewed commands and immutable inputs.

## Deferred follow-ups

- WAL archiving/PITR and lower RPO;
- standby PostgreSQL and multi-host HA;
- production self-hosted MinIO cluster;
- centralized logs/metrics/traces;
- automated blue/green or canary deployment;
- project-admin-scoped audit views.

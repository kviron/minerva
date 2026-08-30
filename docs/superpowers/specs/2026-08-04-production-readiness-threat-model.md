# Production readiness threat model

Status: approved by the user on 2026-08-04  
Date: 2026-08-04

## Assets and trust boundaries

Protected assets are user sessions and identities, project/document content,
credential ciphertext and key rings, AI provider keys, OAuth grants/tokens,
public-share capabilities, PostgreSQL data, private objects, audit integrity,
backup repositories, TLS keys, and service availability.

Trust boundaries are Internet to Caddy, Caddy to app, app/migration/backup jobs
to PostgreSQL and S3, operator to Docker/secret files, CI to image registry, and
backup repository to isolated restore environment.

## Threats and required controls

### Public service exposure and proxy spoofing

Only Caddy exposes ports. Database, object storage, app, and admin APIs remain
private. The app trusts forwarding headers only because its network accepts
traffic solely from Caddy. Tests send forged forwarding headers through Caddy
and prove rate limits/audit use the proxy-derived address.

### Secret disclosure

Secrets are per-service files outside Git, bounded on read, excluded from
errors/logs/diagnostics, and rotated through versioned runbooks. Images and
build layers contain no secret. Database backups never contain encryption key
rings; keys are escrowed separately and access-logged.

### Capability and token leakage through logs

Route normalization happens before serialization. Authorization, Cookie,
Set-Cookie, OAuth codes/tokens, public-share path segments, query strings on
security endpoints, request/response bodies, and storage keys are denied fields.
Proxy access logs remain disabled until automated leak tests prove redaction.

### Container escape and lateral movement

Non-root users, dropped capabilities, no-new-privileges, read-only filesystems,
private networks, service-specific secrets, bounded tmpfs, and no Docker socket
mount reduce impact. Backup credentials cannot access application secrets; app
credentials cannot prune backup history.

### Supply-chain compromise

Frozen dependencies, pinned base images/digests, reproducible builds, SBOM,
dependency/container scans, signed release evidence, and no runtime package
installation are release gates. Scanner exceptions require owner, rationale,
expiry, and compensating control.

### Migration failure and incompatible rollback

One migration job runs before readiness. Failed migrations stop deployment.
Additive/backward-compatible migrations are the default. The prior image is
rolled back only when compatibility is proven; destructive changes need their
own ADR, fresh backup, rehearsal, and forward recovery path.

### Backup theft, deletion, and ransomware

Restic encrypts off-host dumps. Repository credentials are distinct and scoped;
retention/immutability is enabled where supported. An attacker controlling the
VPS must not be able to delete every retained copy. Regular `check` and restore
drills detect corruption and credential drift.

### Incomplete database/object/key recovery

A successful dump alone is not success. Restore acceptance enumerates database
records, referenced private objects, and every encryption-key version. Missing
objects or undecryptable records fail the drill. Recovery manifests contain
checksums and safe identifiers, never secrets.

### Disk, memory, and log exhaustion

Container resource limits, PostgreSQL volume monitoring, Docker log rotation,
bounded upload/body limits, backup staging cleanup, and disk alerts prevent
silent host exhaustion. Backup jobs fail safely before consuming the final
reserved disk margin.

### Health endpoint reconnaissance

Public probes expose only healthy/unavailable status. Dependency names,
versions, URLs, buckets, migrations, timings, and exceptions remain internal.
Readiness has strict timeouts and cannot become an amplification endpoint.

### Header and browser attacks

HTTPS/HSTS, secure cookies, route-aware CSP, frame-ancestor denial, no-sniff,
referrer control, trusted origins, and existing CSRF/OAuth checks are verified
on success and error responses. Public-share pages retain no-referrer/no-store.

### Audit abuse and metadata leakage

Audit browsing is read-only, super-admin-only, cursor-bounded, no-store, and
projects metadata through an allow-list. It never returns raw metadata JSON,
credential values, document bodies, tokens, capabilities, IP addresses, or
storage paths. Audit reads themselves are audited without recursive payloads.

### Operational mistakes

Preflight validation catches missing secrets, wrong canonical URLs, public
private-service ports, stale backups, and invalid Compose. Runbooks use explicit
environment names and require confirmation for restore/prune/rotation actions.
Production cleanup commands are never copied from development workflows.

## Verification gates

- An external port scan sees only intended SSH/HTTP/HTTPS ports.
- Forged proxy headers do not control client identity.
- Secret/capability canaries are absent from images, logs, errors, SBOM, and
  generated artifacts.
- App starts non-root with read-only root filesystem and no Linux capabilities.
- Migration failure prevents readiness without corrupting the previous release.
- Backup repository survives simulated VPS loss and restores within RTO.
- Missing object or encryption key makes the drill fail explicitly.
- Security headers and cookies pass route-specific automated checks.
- Audit projections remain authorization-scoped and content-free.

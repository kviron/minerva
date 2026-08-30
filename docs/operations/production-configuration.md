# Production configuration and health

Status: PR.1 and PR.2 implemented; backup and release slices remain incomplete  
Date: 2026-08-04

## Secret-file boundary

Minerva keeps its browser-safe parsing contracts in `shared/config/env.ts` and
performs filesystem access only in the server runtime configuration boundary.
Development may continue to provide direct environment values. Production may
instead provide the following file references:

| Value | File reference |
| --- | --- |
| `DATABASE_URL` | `DATABASE_URL_FILE` |
| `BETTER_AUTH_SECRET` | `BETTER_AUTH_SECRET_FILE` |
| `RATE_LIMIT_HMAC_SECRET` | `RATE_LIMIT_HMAC_SECRET_FILE` |
| `CREDENTIAL_ENCRYPTION_KEYS` | `CREDENTIAL_ENCRYPTION_KEYS_FILE` |
| `S3_ACCESS_KEY_ID` | `S3_ACCESS_KEY_ID_FILE` |
| `S3_SECRET_ACCESS_KEY` | `S3_SECRET_ACCESS_KEY_FILE` |

For each pair, define exactly one of the direct value or file reference. A
conflict, empty path, unreadable file, file larger than 64 KiB, or value failing
the existing Zod contract blocks configuration initialization. One final LF or
CRLF is removed so standard secret files work; other whitespace is preserved.
Errors contain only the stable configuration key, never the path or contents.

Files must be UTF-8, mounted read-only, scoped only to the service that needs
them, and stored outside the repository. The complete production Compose secret
mapping is defined in `compose.production.yml`. The host operator must create
the referenced files under an ignored `secrets/` directory, restrict them to
the deployment account, and never copy them into an image layer.

`MAILPIT_API_URL` is optional because Mailpit is a development/test dependency.
SMTP delivery configuration remains required in production.

## Health endpoints

- `GET /api/health/live` returns `{ "status": "ok" }` when the Nitro process can
  handle a request. It performs no dependency I/O.
- `GET /api/health/ready` returns `{ "status": "ok" }` only after all runtime
  configuration parses, PostgreSQL accepts a bounded query, the database has at
  least the migration required by this application release, and the configured
  S3 bucket accepts a bounded `HeadBucket` request.
- A readiness failure returns HTTP 503 with
  `{ "status": "unavailable" }`. It does not identify the dependency or return
  URLs, buckets, migration IDs, paths, credentials, or exceptions.

PostgreSQL connect and statement work and the S3 request have three-second
bounds. The migration timestamp constant is protected by a source test against
the latest accepted Drizzle journal entry and must advance with every migration.

The legacy database-only health endpoint remains available for development
compatibility. Production orchestration must use `/api/health/live` and
`/api/health/ready`.

## Immutable image and production graph

`Dockerfile` installs the exact `bun.lock` with `--frozen-lockfile`, builds Nuxt
under pinned Node, bundles the one-shot migration runner, and copies only Nitro
output, the runner, and accepted migrations into the pinned Bun runtime. The
runtime user is `bun`; no source tree, dependency tree, `.env`, upload, backup,
or generated-memory directory enters the final image.

`compose.production.yml` is independent from development Compose and contains
only Caddy, the migration job, Minerva, and PostgreSQL. Only Caddy publishes
host ports. The backend network is internal. The app cannot start until
PostgreSQL is healthy and the exact-image migration job exits successfully.
A failed migration therefore blocks the deployment instead of serving against
an older schema.

App and migration containers use a read-only root, drop every capability,
enable `no-new-privileges`, receive bounded tmpfs storage, and have explicit
stop, restart, log-rotation, and resource policies. Caddy owns automatic HTTPS
and reverse proxies only to `app:3000`; raw request access logging is not
enabled because public share paths are bearer capabilities.

Render and validate configuration before every deployment:

```sh
docker compose --env-file /etc/minerva/production.env \
  -f compose.production.yml config --quiet
docker compose --env-file /etc/minerva/production.env \
  -f compose.production.yml build app
docker compose --env-file /etc/minerva/production.env \
  -f compose.production.yml up -d
```

`MINERVA_IMAGE` must be an immutable release tag or digest. Public environment
values include the domain, SMTP endpoint/from address, active credential-key
version, and external S3 endpoint/region/bucket. Secret values are supplied
only by the files listed above plus PostgreSQL's dedicated password file.
External S3 versioning and off-host recovery are mandatory production
preconditions but are completed and drilled in PR.4.

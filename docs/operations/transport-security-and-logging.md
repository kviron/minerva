# Transport security and structured logging

Status: PR.3 implemented; centralized observability remains deferred
Date: 2026-08-05

## Header ownership

Minerva applies one application-owned response policy to HTML, JSON, errors,
images, SSE, MCP, OAuth metadata, and public documentation. It includes a
deny-by-default CSP, frame-ancestor denial, MIME sniffing prevention, a strict
referrer policy, restricted browser capabilities, and same-origin resource
isolation. Figma is the only external frame allow-list. Inline scripts and
styles remain allowed because the current Nuxt color-mode/bootstrap and UI
runtime require them; `unsafe-eval`, external script origins, and arbitrary
frames remain forbidden.

HSTS is owned only by Caddy because the internal application hop is HTTP.
Caddy emits one-year HSTS after automatic TLS termination and keeps raw request
access logging disabled. Only Caddy is host-published, so `TRUST_PROXY=true` is
valid only in the production Compose topology. Better Auth selects secure
cookies whenever its canonical base URL is HTTPS.

## Request identity

Every response receives `X-Request-ID`. A caller-provided value is propagated
only when it is a canonical UUID v4; all other values are replaced with a
cryptographically generated UUID. The identifier is correlation metadata, not
authentication or authorization evidence.

## Closed structured logs

The Nitro request plugin writes one JSON record for a completed request or an
unexpected failure. The record has only these fields:

- `timestamp`, `level`, and fixed `event`;
- `requestId`, bounded HTTP `method`, and redacted route template;
- numeric `statusCode` and rounded non-negative `durationMs`.

The logger never accepts or reads authorization/cookie headers, request or
response bodies, query strings, full URLs, document or credential content,
provider payloads/errors, database/S3 credentials, object paths, capability
segments, exception messages, or stacks. UUIDs, public capabilities, numbers,
and unsafe route segments are replaced before logging. Log rotation remains
bounded by production Compose at five 10 MiB files per service.

## Initial operator alerts

Until centralized metrics exist, the operator must inspect Docker health and
JSON logs and alert on:

- readiness unhealthy for more than two minutes;
- any restart loop or migration container non-zero exit;
- five-minute HTTP 5xx ratio above 5% with at least 20 requests;
- ten or more authentication/authorization denials per minute from one trusted
  proxy source, investigated without enabling raw URL/header logging;
- log-driver errors, disk usage above 80%, or PostgreSQL/S3 health failures.

Alerts must reference request IDs and safe route templates only. Temporary
debugging must not enable request access logs, bodies, headers, or exception
serialization in production.

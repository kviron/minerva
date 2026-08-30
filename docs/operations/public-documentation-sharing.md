# Public documentation sharing operations

## Runtime boundary

- Expose only `GET /api/public/documentation/:capability`, its `pages/:documentId`, and `images/:imageId` descendants.
- Preserve `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow, noarchive` at the reverse proxy.
- Never log raw `/api/public/documentation/<capability>` or `/share/documentation/<capability>` paths. Use the redacted telemetry path.
- Do not cache public JSON, HTML, redirects, 404 responses, or images at a CDN or proxy.

## Incident response

Rotate a link when its capability may have been copied outside the intended audience. Revoke it when access must stop without replacement. Both operations must make the previous capability unavailable on the next request. Archiving the shared root or moving a page outside a dynamic branch also removes it immediately from the public projection.

Treat any capability found in logs, analytics, error reports, browser recordings, generated indexes, or support exports as compromised: revoke or rotate it, remove the retained copy, and inspect the affected systems for URL and stack serialization.

## Release checks

Run the public documentation Playwright journey against the isolated test database, then the complete unit, PostgreSQL integration, and E2E suites. Inspect unavailable JSON for absence of `url`, `stack`, capability values, storage paths, and user data. Confirm that direct out-of-scope page and image requests return the same neutral unavailable response.

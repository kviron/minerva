# Document Images Implementation Plan

**Status:** Approved by the user on 2026-07-14.

**Goal:** Allow authorized editors to upload private images, insert them into Tiptap documents, preserve references in immutable versions, and render them through an authorized project-scoped read path.

## Architecture

- Keep binary objects private in the S3-compatible Files boundary; PostgreSQL stores metadata and server-only object keys.
- Use MinIO in local Docker Compose and the AWS S3 client behind a narrow storage adapter. No object-store credential, bucket name, or object key enters a browser contract.
- Store Tiptap image nodes as `{ type: 'image', attrs: { imageId, alt } }`. The stable image UUID is independent from storage layout and routes.
- Require `documents.update_draft` to upload and `documents.view` to read. Both checks happen server-side using permission codes.
- Accept PNG, JPEG, GIF, and WebP up to 10 MiB. Validate the declared MIME type, extension-independent magic bytes, non-empty content, and normalized display name.
- Store current draft references in `documents.draft_referenced_image_ids`; publication copies them into `document_versions.referenced_image_ids`; version restore copies them back.
- Before saving a draft, verify every referenced image is active and belongs to the same project. Historical reads may still serve archived images referenced by immutable versions.
- This slice does not add generic attachments, image editing, public URLs, or physical deletion.

## TDD slices

1. Add failing unit tests for image-node validation, deterministic reference extraction, MIME/magic-byte validation, and safe object-key construction.
2. Add failing migration coverage for image metadata and draft reference snapshots; generate the additive migration.
3. Implement the Files metadata schema, S3 adapter, upload application service, authorized read service, and strict Nitro multipart/read handlers.
4. Extend draft save, publish, restore, and document/version read paths to preserve stable image references.
5. Add failing client tests, then implement the Tiptap image node, titled upload Dialog, stateless API/action call, and safe image rendering in current and historical views.
6. Run focused unit and PostgreSQL integration tests, Nuxt typecheck, production build, apply the local migration, update `docs/progress.md`, and refresh Tesserae through the Windows wrapper.

## Security invariants

- Inaccessible projects and images return the same not-found response as missing resources.
- Browser responses expose only the image UUID, normalized display name, MIME type, size, and application read URL.
- Audit metadata contains image ID, MIME type, and byte count only; never binary content, object keys, credentials, or local paths.
- Upload failures attempt object cleanup, while unreferenced active uploads remain recoverable metadata for future insertion and lifecycle cleanup.
- Physical deletion of an image referenced by any published version is outside this slice and remains forbidden by the product specification.

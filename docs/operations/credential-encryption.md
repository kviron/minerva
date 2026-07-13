# Credential encryption operations

## Primitive and envelope

Credential values use AES-256-GCM with a fresh cryptographically random 96-bit nonce for every encryption. The 128-bit authentication tag is appended to the ciphertext before Base64 encoding. PostgreSQL stores only Base64 ciphertext/tag, Base64 nonce, and a positive key version.

Associated data is UTF-8 encoded as:

```text
minerva:credential:v1|<projectId>|<categoryId>|<credentialId>|<field>
```

This binds a value to its project, category, credential, and logical field. Moving ciphertext between records or fields must fail authentication.

## Configuration

Keys remain outside PostgreSQL and must be supplied through the deployment secret store:

```text
CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION=1
CREDENTIAL_ENCRYPTION_KEYS=1:<base64-encoded-32-byte-key>
```

Multiple decryption keys are comma-separated. Generate a key with a trusted local tool, for example `openssl rand -base64 32`, and transfer it through the deployment secret channel. Never commit real keys to Git, Compose files, logs, tickets, backups, or Tesserae.

The Credentials runtime refuses to start when the active version is absent, duplicated, malformed, or not exactly 32 bytes. Other application modules do not read this configuration.

## Rotation

1. Generate a new 32-byte key and add it under a new positive version while keeping every old key.
2. Set the new version active and restart the application. All new writes use it; old values remain readable.
3. Run the future reviewed re-encryption job in bounded transactions. It must decrypt with the stored version, encrypt with the active version and fresh nonce, and preserve associated-data identity.
4. Verify no database envelope references the old version and complete a restore drill.
5. Remove the old key only after verification and backup-retention policy allow it.

Never reuse a version for different key material and never rotate by rewriting only `key_version`.

## Backup and recovery

Database backups contain ciphertext but not keys. Back up the versioned key set separately in the approved secret-management system with access logging and recovery controls. A restore is successful only when the database and every referenced key version are both available.

Test recovery in an isolated environment using private fixtures. Loss of a referenced key is permanent loss of those credential values; the application deliberately returns one generic decryption error and does not expose whether failure came from tampering, an unknown version, or wrong key material.

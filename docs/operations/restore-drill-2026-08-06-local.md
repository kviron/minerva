# Local restore drill record — 2026-08-06

Status: local production-shaped drill; not an off-host acceptance drill. Contains no secrets, URLs, bucket names, or raw object paths.

- Drill date (UTC): 2026-08-06
- Snapshot ID (safe shortened identifier): `b26c53fd`
- Backup duration: 3.21 seconds
- Restore duration: 2.91 seconds
- Database checksum verified: yes
- Database inventory verified: yes
- Escrowed key-version inventory verified: yes, against a local drill fixture
- Recovered object inventory verified: yes, against a disposable local object
- Application probes verified: no; this drill covered the data recovery boundary
- Corrupt-dump simulation failed safely: yes; resumed 2026-08-08 in a fresh hardened disposable repository, checksum verification stopped restore before PostgreSQL access
- Missing-object simulation failed safely: yes
- Missing-key simulation failed safely: yes
- Repository-unavailable simulation failed safely: yes
- Plaintext staging and isolated volumes destroyed: yes; the restore trap emptied staging and the four verified disposable PR.4 volumes were removed on 2026-08-08
- RPO 24h met: not evaluated against an external repository
- RTO 4h met: yes for the local database restore, not yet proven end to end
- Outcome: local pass; the happy path, all four required failure paths, and disposable-resource cleanup passed. External acceptance remains open.
- Follow-up: repeat the full timed drill using the selected off-host backup, independent object-copy, and key-escrow providers, including application probes.

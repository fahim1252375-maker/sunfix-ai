# Data backup and recovery

## Current protection

The Firebase Console inspection reported Firestore backups disabled. There is no configured backup schedule, export bucket, retention policy, or tested restore process. The AI Studio Starter shared-quota database remains no-cost and has service quota limits; this project did not enable billing or a paid backup feature.

Browser IndexedDB is an offline working copy, not a backup. Browser storage can be cleared, evicted, damaged, or lost with a device. The application now has a schema-v2 Firestore read/write path for validated domain records, but existing live v1 documents do not contain the fields required for complete restore. FieldProof image/audio binaries and generated PDFs remain local; no object-storage provider is configured. Repository rules for v2 have not been deployed, and no live v2 write/read drill has been performed.

## Recovery plan before production data

1. Decide a backup/export mechanism compatible with the project's no-cost constraint and retention requirements; verify current Firebase plan eligibility in Console before activation.
2. Define scope, frequency, retention, access control, storage location, encryption, and restore owner.
3. Create a test project/database only with separate authorization; restore a non-production export and verify record counts, ownership, safety holds, and linked files.
4. Document Recovery Point Objective and Recovery Time Objective only after a measured restore drill.
5. Keep user-facing export of local-only evidence available until files have verified remote persistence.

No backup or recovery operation was performed, and no backup capability is claimed. Schema-v2 Firestore hydration is an application sync path, not a backup service.

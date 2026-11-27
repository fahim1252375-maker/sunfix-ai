# Firestore schema and query inventory

## Target database

- Firebase project: `avid-grin-p01dl`
- Named Firestore database: `ai-studio-dcfb1e98-5786-4f95-9e81-c11da4cfcc33`
- Region: `asia-south1`
- Rules source: repository `firestore.rules`
- Repository rules were updated for schema v2, but were not deployed to the live database.

## Version 2 records

The sync path stores a bounded summary used by Security Rules and a validated `domainPayload` JSON string that carries the complete restorable domain record. Binary data URLs and `cloudRevision` are removed before serialization. Each document includes `id`, `ownerId` (except the shared knowledge catalog), `schemaVersion: 2`, monotonic `revision`, and an idempotent `lastMutationId`. Payloads are limited to 180,000 characters and 700,000 UTF-8 bytes to leave room below Firestore's document limit. Client IDs are sanitized to `[A-Za-z0-9_-]` and at most 128 characters.

| Collection | Domain data in v2 payload | Summary validated by rules | Read / write behavior |
| --- | --- | --- | --- |
| `users/{uid}` | Profile fields | UID and role constraints | Direct profile get/upsert; no list |
| `assets/{assetId}` | Components, battery/installation data, timestamps and full asset fields | Name, site, capacity, status, inverter and panel summary | Owner-filtered paginated read; create/update with revision check |
| `diagnosticCases/{caseId}` | Readings, safety flags, assessment, causes/actions, inference, timeline and review | Linked IDs, hazard/Stop-Work state, priority/status, inference source and summary | Owner-filtered paginated read; create/update subject to safety and immutable-state rules |
| `workOrders/{workOrderId}` | Tasks, verification, notes, timeline and review | Linked IDs, status, safety clearance and completed/total counts | Owner-filtered paginated read; create/update; completion constraints apply |
| `evidenceRecords/{evidenceId}` | Metadata, notes, geo/audio transcript metadata and persistence status | Linked IDs, type/origin and caption | Owner-filtered paginated read; create-only; image/audio bytes remain local |
| `serviceReports/{reportId}` | Complete report data and canonical hash | Report identity, status and summary | Owner-filtered paginated read; create-only; generated PDF remains browser-side |
| `knowledgeDocs/{docId}` | Extracted/manual knowledge text and metadata | Title, publisher, category, source and verified date | Owner-filtered paginated read; create-only; original PDF is not stored |
| `copilotThreads/{threadId}` | Complete messages and timestamps | Title, language, message count and last-message preview | Owner-filtered paginated read; create/update |

Reads fetch pages of 100 documents and apply an explicit `ownerId == uid` filter. V2 documents are decoded through entity-specific Zod schemas and checked for matching document ID and owner. Legacy, malformed, oversized, or mismatched payloads are reported as incomplete; the client does not invent missing fields. Existing local copies are preserved when a cloud record is incomplete.

## Revisions and compatibility

The client uses Firestore transactions and `baseRevision` for optimistic concurrency. Creates begin at revision 1; updates increment exactly one revision. `lastMutationId` makes an acknowledged retry idempotent. Conflicts retain both the local payload and remote snapshot for review. Replayed deletes are disabled. Existing live v1 summary-only records cannot be restored as full domain records and are surfaced as incomplete. The live rules currently predate v2 and must be reviewed and deployed separately before v2 writes can succeed. No migration or backfill was performed.

The app loads the account-scoped IndexedDB snapshot and queue first, then merges owner-filtered cloud records after verified sign-in. Pending local edits win over the fetched snapshot; server records replace stale local copies; records known to have been synced but missing remotely become conflicts. Demo fixtures are never copied into an authenticated workspace. On offline or denied reads, the matching account's local snapshot remains visible with a status warning.

## Authorization and indexes

Rules default-deny unknown collections. Verified users may query only records owned by their Auth UID; document-ID gets can probe absent IDs without reading another owner's existing records. Owner, ID, and creation metadata are immutable where applicable. Stop-Work state, linked record ownership, and work-order completion are enforced by rules. Current list queries use a single owner equality filter with pagination; no composite index is required by the code path.

No cloud migration, data backfill, destructive cleanup, or live rules deployment was performed.

# Firestore schema and query inventory

## Target database

- Firebase project: `avid-grin-p01dl`
- Named Firestore database: `ai-studio-dcfb1e98-5786-4f95-9e81-c11da4cfcc33`
- Region: `asia-south1`
- Rules source: repository `firestore.rules`
- The live rules were inspected separately; no production rules were deployed.

The following describes the repository's current wire documents, not the richer in-memory TypeScript models. Client IDs are sanitized to `[A-Za-z0-9_-]` and at most 128 characters. User-generated record IDs are created by the client; ownership is derived from the authenticated Firebase UID by the sync service and checked by rules. Cloud timestamps use Firestore server timestamps. Local timestamps are ISO strings.

| Collection / ID | Current wire fields | Writes / reads | Ownership / constraints |
| --- | --- | --- | --- |
| `users/{uid}` | `uid`, `displayName`, `email`, `role`, `createdAt`, `updatedAt` | Profile create/update; direct profile get; no profile list | UID must match Auth UID; create role is forced to `technician`; role immutable; delete denied |
| `assets/{assetId}` | `id`, `ownerId`, `name`, `siteType`, `locationLabel`, `capacityKw`, `status`, inverter fields, optional battery fields, `panelCount`, `isDemo`, timestamps | `setDoc` create / `updateDoc` update; owner-filtered aggregate query only | Verified email; owner immutable; schema bounds; owner can delete |
| `diagnosticCases/{caseId}` | IDs, component/title, optional fault/readings summary, hazard/Stop-Work flags, priority/status, inference source, assessment summary, optional review fields, timestamps | Create and limited summary/status updates; counts query only | Verified email; asset must belong to owner; immutable identity/asset/createdAt; resolved cases immutable; hazards require `safety_blocked` and Stop-Work |
| `workOrders/{workOrderId}` | IDs, title/status/priority, `safetyCleared`, optional notes, completed/total step counts, review fields, timestamps | Create and limited summary updates; counts query only | Verified email; linked case and asset must belong to owner; completion requires safety cleared and every step complete; completed orders cannot be changed |
| `evidenceRecords/{evidenceId}` | IDs, evidence type/origin, caption, optional note, `createdAt` | Create only; aggregate listing is not currently used | Verified email; linked case must belong to owner; record is metadata only; files are absent |
| `serviceReports/{reportId}` | IDs/report code/title/status/summary/`isSimulated`, optional canonical hash, `createdAt` | Create only; counts query only | Verified email; linked case must belong to owner; report PDF is absent |
| `knowledgeDocs/{docId}` | ID/title/publisher/category, optional fault code/source URL, summary, verified date, `createdAt` | Create only; no cloud read/hydration | Verified email; owner scoped; original PDF absent |
| `copilotThreads/{threadId}` | ID/title/language/message count/last message preview/timestamps | Create/update metadata; no cloud read/hydration | Verified email; owner scoped; full messages are local only |

## Missing schema coverage

Several important fields from `src/types/sunfix.ts` are currently local only: asset component inventory/installation metadata; complete diagnostic readings, safety flags, assessment causes/actions and timelines; work-order tasks and verification/review history; evidence image/audio/geo files; complete report content and PDF; knowledge symptoms/safety details and source document; Copilot messages/actions/feedback. Cloud persistence must not be advertised as complete until these fields have an explicit versioned schema and tested restore path.

## Queries and indexes

Current count path uses `getCountFromServer` for four owner equality queries on `assets.ownerId`, `diagnosticCases.ownerId`, `workOrders.ownerId`, and `serviceReports.ownerId`; it returns counts without downloading each matching document. These are single-field equality queries; no composite index is evidenced by current code. No standalone `firestore.indexes.json` is needed for the current queries. The application does not yet paginate cloud entity reads because it does not load entity lists from Firestore. Add indexes only alongside a concrete query that requires them.

## Authorization and deletion

Repository rules default-deny unknown collections. For entity collections, verified users can query only documents whose `ownerId` equals their Auth UID. Document-ID gets allow an absent document to be checked for create but deny an existing document owned by another user. Writes cannot change `ownerId`, ID, or creation timestamp. Most deletes are owner-authorized, although no UI delete flow is currently wired for the synced entity collections.

## Migration policy

No migration or cloud data backfill was performed. If full cloud hydration is added, use a schema version and explicit decoder with reject/quarantine handling for incomplete or unexpected documents. Keep local records intact until cloud restore is verified. Never infer an owner, role, file, or missing field from demo fixtures.

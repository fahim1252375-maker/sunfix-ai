# SunFix AI architecture and data flow

## Current topology

```text
Browser (React 19 + Vite PWA)
  ├─ Firebase Auth: Google sign-in
  ├─ Firebase App Check: reCAPTCHA Enterprise when configured
  ├─ Firebase AI Logic: direct client SDK; live project setup is not yet enabled
  ├─ Firestore named database: owner-scoped metadata writes through client SDK
  └─ IndexedDB: account-scoped workspace snapshot and retry queue

Vercel: static `dist` hosting with SPA deep-link fallback (configuration prepared;
        no project linked and no deployment made)
```

There is no Firebase Admin SDK, Vercel Function, standalone API server, Firebase Storage adapter, or remote object store. Firestore Security Rules remain the authorization boundary for client Firestore calls. Vercel does not replace Firebase Auth or Firestore.

## Operation and persistence map

| Operation | UI / state source | Local persistence | Firestore persistence | Authentication / enforcement |
| --- | --- | --- | --- | --- |
| Create/update asset | `SunFixContext.addOrUpdateAsset` | Full app object in account-scoped IndexedDB; queued | `assets/{id}`; v2 bounded summary plus validated full domain payload | Verified Firebase user required by sync helper; revision and owner enforced by transaction/rules |
| Create/update diagnostic case | `submitDiagnosis`, case update actions | Full assessment, timeline and readings in IndexedDB; queued | `diagnosticCases/{id}`; v2 full validated payload and safety summary | Verified user; asset owner check; Stop-Work and revision validation in rules |
| Create/update work order | Work order context actions | Full tasks/timeline/notes in IndexedDB; queued | `workOrders/{id}`; v2 full validated payload and task counts | Verified user; linked owner checks; safety/completion and revision validation |
| Save evidence metadata | `addEvidenceRecord` | Evidence object in IndexedDB | `evidenceRecords/{id}` metadata only | Verified user and owned case required by rules |
| Save evidence photo/audio | FieldProof UI | Data URL in account-scoped IndexedDB; marked `local_only` | Binary stripped from Firestore v2 payload; no file provider configured | Local browser only; clearing browser storage can remove the only file copy |
| Create service report | `generateServiceReport` | Report and canonical hash in IndexedDB | `serviceReports/{id}` selected fields and hash; no PDF blob upload | Verified user and owned case required by rules |
| Save knowledge document | `addKnowledgeSource` | Full extracted/manual entry in IndexedDB | `knowledgeDocs/{id}` selected text metadata; no original PDF upload | Verified user; owner scoped |
| Save Copilot thread | Copilot context actions | Full thread/messages in IndexedDB | `copilotThreads/{id}`; v2 full validated payload plus summary | Verified user; owner scoped; revision checked |
| Demo and twin controls | React context / deterministic fixtures | Some values in workspace snapshot | Not all demo or visualization state is synchronized | Demo data can appear before a user has cloud records; do not treat it as cloud data |

## Cloud read and restore path

After verified sign-in, the app loads that UID's IndexedDB workspace and queue, then fetches owner-filtered pages for all seven domain collections. V2 payloads are validated and restored; cloud revisions are retained for the next optimistic update. Server records replace stale local records while pending edits, conflicts, and local-only drafts are preserved. Missing previously-synced records become conflicts. Legacy or invalid records are counted in a warning and are not converted into guessed domain objects. Offline and permission-denied reads keep the account-scoped local snapshot visible.

The live database currently has older rules/schema records. This branch's v2 writes require a separately reviewed live rules deployment. No v1 migration or backfill was run, and a cloud read of legacy metadata cannot restore fields that were never stored.

## Offline and synchronization behavior

- IndexedDB database: `sunfix-field-db`, version 2; workspace keys and queued mutations are scoped by Firebase UID (or `anonymous`). Legacy unscoped queue entries are deleted during migration because ownership cannot be inferred safely.
- A local mutation updates React state and queues an idempotent document ID. The client checks the current Auth UID before each queued write; Firestore rules re-check identity and document ownership.
- Firestore writes use transactions, server timestamps, `baseRevision`, incrementing `revision`, and `lastMutationId` for optimistic concurrency and idempotent acknowledgement. A newer edit created during an in-flight write gets its own queue item.
- Cloud validation failures and remote-completed-work-order changes remain failed/conflicted. Retry attempts are bounded; conflicts and local-only drafts are not silently replayed.
- IndexedDB read/write failures now reject and are surfaced in Settings. Queue items become pending only after their initial local persistence succeeds.
- “Keep Local Draft” retains the local payload and any remote snapshot without claiming it was synced.
- There is no cloud subscription. Startup hydration is paginated; successful writes update local revision state, while the next app startup performs a full owner-filtered read.

## AI and safety

`src/services/hybridAI.ts` uses Firebase AI Logic in the browser when configured and deterministic local rules when it is not. Runtime source labels must reflect SDK/provider results; current live AI Logic setup remains blocked in the Firebase project. The deterministic electrical Stop-Work gate runs separately from model output and repository Firestore rules validate hazard holds. No Vercel AI proxy or private model credential exists.

## File persistence

FieldProof photo data is currently a JPEG/PNG Data URL in the local workspace snapshot and is not uploaded to Firestore or object storage. The UI now identifies this as browser-only and rejects files over 10 MiB. Imported PDFs are sent to the configured AI path for extraction when available; saved knowledge records contain text/metadata, not the source PDF. Generated report PDFs are rendered/downloaded in the browser; no remote PDF archive exists. Cross-device file retrieval is not implemented.

## Readiness gaps

1. Review and separately deploy the v2 repository Firestore rules before live writes; no rules were deployed in this task.
2. Configure and verify live App Check and Firebase AI Logic under project-owner permissions.
3. Select and authorize a file-storage service before implementing remote FieldProof files.
4. Resolve the dependency advisories documented in `SECURITY_REVIEW.md` before production.

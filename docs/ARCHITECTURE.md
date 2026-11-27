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
| Create/update asset | `SunFixContext.addOrUpdateAsset` | Full app object in account-scoped IndexedDB; queued | `assets/{id}`; only selected scalar fields are serialized | Verified Firebase user required by sync helper; rules enforce owner and schema |
| Create/update diagnostic case | `submitDiagnosis`, case update actions | Full assessment, timeline and readings in IndexedDB; queued | `diagnosticCases/{id}` stores summary/status/safety subset, not complete assessment | Verified user; asset owner check on create; owner and Stop-Work validation in rules |
| Create/update work order | Work order context actions | Full tasks/timeline/notes in IndexedDB; queued | `workOrders/{id}` stores counts and selected fields, not each task or full timeline | Verified user; owned case and asset checks; safety and completed status validation |
| Save evidence metadata | `addEvidenceRecord` | Evidence object in IndexedDB | `evidenceRecords/{id}` metadata only | Verified user and owned case required by rules |
| Save evidence photo/audio | FieldProof UI | Data URL in workspace snapshot (browser origin storage) | No file upload | Local browser only; clearing browser storage can remove the only file copy |
| Create service report | `generateServiceReport` | Report and canonical hash in IndexedDB | `serviceReports/{id}` selected fields and hash; no PDF blob upload | Verified user and owned case required by rules |
| Save knowledge document | `addKnowledgeSource` | Full extracted/manual entry in IndexedDB | `knowledgeDocs/{id}` selected text metadata; no original PDF upload | Verified user; owner scoped |
| Save Copilot thread | Copilot context actions | Full thread/messages in IndexedDB | `copilotThreads/{id}` title/language/count/last preview only | Verified user; owner scoped; message content is not uploaded |
| Demo and twin controls | React context / deterministic fixtures | Some values in workspace snapshot | Not all demo or visualization state is synchronized | Demo data can appear before a user has cloud records; do not treat it as cloud data |

## Cloud read path limitation

The current signed-in startup path initializes Firebase Auth, attempts a profile upsert, and fetches server-side aggregate record counts. It does **not** fetch and hydrate the user's Firestore assets, cases, work orders, evidence, reports, knowledge documents, or Copilot threads. The visible working set comes from demo fixtures or that account's IndexedDB snapshot. A second device therefore cannot reconstruct the complete operational records from Firestore. Counts are not evidence of a complete cloud read path.

The Firestore serializer intentionally stores only a subset of each application model. Implementing cross-device restoration requires a versioned serialization/migration design, complete validators and emulator tests, and live data compatibility review. Do not silently hydrate incomplete cloud documents into full domain objects.

## Offline and synchronization behavior

- IndexedDB database: `sunfix-field-db`, version 2; workspace keys and queued mutations are scoped by Firebase UID (or `anonymous`). Legacy unscoped queue entries are deleted during migration because ownership cannot be inferred safely.
- A local mutation updates React state and queues an idempotent document ID. The client checks the current Auth UID before each queued write; Firestore rules re-check identity and document ownership.
- Firestore writes use server timestamps for cloud `createdAt`/`updatedAt` fields. Existing records use `updateDoc`; creates use deterministic app record IDs, so a retry does not create a second document.
- Cloud validation failures and remote-completed-work-order changes can remain failed/conflicted in the queue. Retry is available for failed entries. The queue and IndexedDB persistence helpers currently swallow storage errors; unavailable/evicted browser storage is therefore a data-loss risk that requires UI observability before production use.
- “Keep Local” resolves a detected conflict only in the local queue; it does not update Firestore. Treat the remote document as authoritative until a separately reviewed reconciliation is performed.
- There is no cloud subscription or complete cloud read-back after a write. Successful client write status confirms the serialized document write, not cross-device restoration of the full model.

## AI and safety

`src/services/hybridAI.ts` uses Firebase AI Logic in the browser when configured and deterministic local rules when it is not. Runtime source labels must reflect SDK/provider results; current live AI Logic setup remains blocked in the Firebase project. The deterministic electrical Stop-Work gate runs separately from model output and repository Firestore rules validate hazard holds. No Vercel AI proxy or private model credential exists.

## File persistence

FieldProof photo data is currently a JPEG/PNG Data URL in the local workspace snapshot and is not uploaded to Firestore or object storage. The UI now identifies this as browser-only and rejects files over 10 MiB. Imported PDFs are sent to the configured AI path for extraction when available; saved knowledge records contain text/metadata, not the source PDF. Generated report PDFs are rendered/downloaded in the browser; no remote PDF archive exists. Cross-device file retrieval is not implemented.

## Readiness gaps

1. Add complete, validated Firestore read/hydration and pagination before calling cloud storage a system of record for the full application model.
2. Add observable IndexedDB failure handling and clear local-only/pending/conflict states.
3. Configure and verify live App Check and Firebase AI Logic under project-owner permissions.
4. Select and authorize a file-storage service before implementing remote FieldProof files.
5. Reconcile and deploy the stronger repository rules only after a separately authorized production review; no rules were deployed in this task.
6. Resolve the dependency advisories documented in `SECURITY_REVIEW.md` before production.

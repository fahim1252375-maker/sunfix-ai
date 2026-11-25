# SunFix Field — Security Specification (Payload-First TDD)

## 1. Data Invariants
1. **PII Isolation**: User profile records under `/users/{userId}` may only be read or written by the matching authenticated user (`request.auth.uid == userId`) with verified email (`request.auth.token.email_verified == true`).
2. **Strict Ownership**: Every operational document (`/assets/{assetId}`, `/diagnosticCases/{caseId}`, `/workOrders/{workOrderId}`, `/evidenceRecords/{evidenceId}`, `/serviceReports/{reportId}`, `/knowledgeDocs/{docId}`) must store `ownerId == request.auth.uid` on creation and preserve `ownerId` immutably on update.
3. **Referential Integrity**:
   - Creating a `DiagnosticCase` requires an existing parent `Asset` whose `ownerId == request.auth.uid`.
   - Creating a `WorkOrder` requires an existing parent `DiagnosticCase` and `Asset` both owned by `request.auth.uid`.
   - Creating an `EvidenceRecord` or `ServiceReport` requires an existing parent `DiagnosticCase` owned by `request.auth.uid`.
4. **Temporal & Structural Integrity**:
   - `createdAt == request.time` on create; `createdAt` is immutable on update.
   - `updatedAt == request.time` on create and update for mutable records.
   - All document IDs match `^[a-zA-Z0-9_-]+$` and `size() <= 128`.
   - All strings enforce explicit `.size()` bounds; all keys are strictly constrained with `hasAll` + `hasOnly` on create and `affectedKeys().hasOnly(...)` on update.
5. **Terminal State Locking**: Once a `DiagnosticCase` reaches `resolved` or a `WorkOrder` reaches `completed`, ordinary client updates cannot revert or mutate completed records.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: Writing `/assets/a1` with `request.auth == null`.
2. **Owner Spoofing**: Authenticated user `uid_a` creating `/assets/a1` with `ownerId: "uid_b"`.
3. **Cross-Tenant List Scraping**: Authenticated user `uid_a` listing `/assets` without filtering `where('ownerId', '==', 'uid_a')`.
4. **Ghost Field Injection (Shadow Update)**: Creating `/assets/a1` with an extra undeclared field `isAdmin: true`.
5. **Unverified Email Bypass**: Writing `/users/uid_a` when `request.auth.token.email_verified == false`.
6. **ID Poisoning**: Creating `/assets/../../evil` or an ID exceeding 128 characters.
7. **Orphaned Diagnostic Case**: Creating `/diagnosticCases/c1` referencing a non-existent `assetId: "missing-asset"`.
8. **Cross-Tenant Parent Linking**: User `uid_a` creating `/diagnosticCases/c1` referencing an `assetId` owned by `uid_b`.
9. **Client Timestamp Forgery**: Creating `/assets/a1` with a backdated `createdAt` string instead of `request.time`.
10. **Immutable Field Mutation**: Updating `/assets/a1` to change `ownerId` or `createdAt`.
11. **Terminal State Rollback**: Updating a `WorkOrder` with `status: "completed"` back to `status: "in_progress"`.
12. **Denial-of-Wallet Oversized Payload**: Writing `assessmentSummary` of 10,000 characters (`> 2000` limit).

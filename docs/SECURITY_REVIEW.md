# Dependency security review

**Review date:** 2026-11-27
**Scope:** Current npm audit metadata, the Bun-resolved Firebase 13.4.0 and Workbox dependency trees, and the production dependency graph.

## Confirmed findings

The prior npm audit report dated 2026-11-26 counted **5 High, 4 Moderate, 0 Critical** findings across its full graph and **4 High, 4 Moderate, 0 Critical** with `--omit=dev`. The current Bun audit counts are recorded in the 2026-11-27 recheck below; do not use the earlier npm counts as the current result.

The affected installed package chain was:

```text
firebase@13.4.0
└── @firebase/firestore@4.20.0
    └── @grpc/grpc-js@1.9.16
```

The npm audit also reports the associated `@firebase/firestore` and `firebase` advisories. npm's suggested Firebase fix is `9.14.0`, a major downgrade from the installed 13.x API and not a safe remediation for this Firebase AI Logic app.

The audit also reported `@firebase/firestore-compat@0.4.18`, which depends on the same Firestore package. The installed `@grpc/grpc-js@1.9.16` is within the advisory's affected range (versions below 1.13.6). The audit output linked these advisories:

- [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j)
- [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4)

## Upstream status checked on 2026-11-26

The Firebase maintainers have now merged [firebase/firebase-js-sdk#10412](https://github.com/firebase/firebase-js-sdk/pull/10412) into the upstream `main` branch on **2026-11-24**. The merged change updates Firestore's declared dependency from `@grpc/grpc-js: ~1.9.0` to `~1.14.7` and `@grpc/proto-loader` from `^0.7.8` to `^0.8.0`. It also adds Node gRPC termination guards and regression tests for the behavioral changes in the newer gRPC line.

However, the published npm artifacts checked on **2026-11-26** had not picked up that upstream change:

- npm `firebase/latest`: `13.4.0`
- npm `@firebase/firestore/latest`: `4.20.0`
- Published `@firebase/firestore@4.20.0` still declares `@grpc/grpc-js: ~1.9.0`.
- The upstream Firestore `main` manifest already declares `~1.14.7`.

Sources: [upstream PR #10412](https://github.com/firebase/firebase-js-sdk/pull/10412), [upstream issue #10400](https://github.com/firebase/firebase-js-sdk/issues/10400), [published Firestore 4.20.0 metadata](https://registry.npmjs.org/@firebase/firestore/4.20.0), and [upstream Firestore package manifest](https://raw.githubusercontent.com/firebase/firebase-js-sdk/main/packages/firestore/package.json).

**Decision:** do not force `@grpc/grpc-js@1.14.x` into the currently published Firestore 4.20.0 package. The upstream PR includes Firestore-side termination-handling changes specifically to preserve behavior with the newer gRPC release. Applying only the dependency override before that patched Firestore package is published would omit those companion code changes and would not be a properly validated remediation.

The dependency graph was rechecked from the installed Bun lock on 2026-11-26 with `bun audit --json` and `bun audit --production --json`. Both report the same distinct advisories for the production-reachable packages: **1 High, 2 Moderate, and 1 Low advisory**. The npm audit report above counts repeated affected package paths separately, which accounts for its larger 4/5 High and 4 Moderate totals. `bun pm why` confirms `@grpc/grpc-js@1.9.16` under Firestore and `glob@11.1.0` / `minimatch@10.2.6` under Workbox; a separate `minimatch@11.0.9` copy used by ESLint is patched for GHSA-g3hv-75wg-m249.

The same-day npm registry check still returned `firebase@13.4.0`, `@firebase/firestore@4.20.0`, and `vite-plugin-pwa@2.0.0` as latest. Firestore 4.20.0 still declares `@grpc/grpc-js: ~1.9.0`; Workbox remains on its 7.4.1 dependency line, whose `glob@^11.0.1` range cannot accept the fixed glob 14.0.2+ line. The patched minimatch release for GHSA-g3hv-75wg-m249 is 11.0.1+, while the vulnerable Workbox path resolves 10.2.6. No compatible, range-admitted remediation was available, so the lockfile was not forced to out-of-range versions.

## Remediation decision

npm suggested `firebase@9.14.0` as an available fix, but marked it as a SemVer-major change from the installed Firebase 13.x dependency. That downgrade was **not** applied because it may remove or break APIs used by the application, including the current Firebase AI Logic integration.

A direct override of `@grpc/grpc-js` to 1.13.6+ was also **not** applied. Firestore 4.20.0 declares `@grpc/grpc-js` as `~1.9.0`; forcing a release outside that range would bypass the SDK's declared compatibility constraint. The upstream fix now exists on Firebase's main branch, but it must be released as a compatible Firestore/Firebase package before this repository can safely adopt it.

A local browser-bundle text inspection did not find the literal identifiers `@grpc/grpc-js`, `grpc-js`, or `grpc_node` in generated browser JavaScript. This is useful context, but it does **not** clear the package-level audit finding or prove that every Node-targeted execution path is unreachable.

## Status

**Open — high-severity dependency remediation required; upstream fix merged but not yet present in the published npm package checked on 2026-11-26.**

Before production release:

1. Recheck npm for a Firebase / Firestore patch release containing the merged upstream #10412 change.
2. Upgrade Firebase to that compatible release and verify the lockfile resolves `@grpc/grpc-js@1.14.7` (or another patched version in the newly declared range) under Firestore's own dependency context.
3. Run the full and production npm audits; confirm the two gRPC advisories are gone.
4. Run Firestore Emulator authorization tests, authenticated offline-to-online sync tests, unit tests, TypeScript, ESLint, and the production build.
5. Record the exact package versions, lockfile diff, audit output, and test results.
6. Do not describe the repository as security-clean until the production audit is clean or a formally accepted, technically justified exception is recorded.

## Workbox and glob findings

The actual Bun dependency tree resolves:

```text
vite-plugin-pwa@2.0.0
└── workbox-build@7.4.1
    └── glob@11.1.0
        └── minimatch@10.2.6
```

The current npm audit reports moderate advisories for `glob` (AbortSignal cancellation bypass), `minimatch` (globparts amplification), and the dependent `workbox-build` / `vite-plugin-pwa` path. The parent ranges do not admit the fixed `glob@14.0.2` line. npm suggests downgrading `vite-plugin-pwa` to `1.1.0`; that crosses the installed major and was not applied without a Vite 8 compatibility review. No nested override was forced.

The Bun lockfile was regenerated from the existing manifest so its already-declared Playwright, emulator-test, and IndexedDB test packages are locked. A frozen install now succeeds. This lockfile refresh does not remediate the advisories above.

## Install-script policy

The isolated Bun trial used `bun install --ignore-scripts` and passed the project checks. CI uses the same setting. Dependencies whose install scripts were blocked remain untrusted until individually reviewed; they are not bulk-approved by this change.

## Recheck on 2026-11-27

Using the committed Bun dependency graph (`bun audit --production` and `bun audit`), both current audits report the same four advisories: **1 High, 2 Moderate, 1 Low, 0 Critical**. Findings are:

- `@grpc/grpc-js@1.9.16`: High GHSA-m9gg-hp2v-232j and Low GHSA-f596-whhp-79r4, pulled through `firebase@13.4.0` → `@firebase/firestore@4.20.0`; Firestore declares `~1.9.0`.
- `glob@11.1.0`: Moderate GHSA-3g3m-2fjr-6pw4, through Workbox's `^11.0.1` dependency range.
- `minimatch@10.2.6`: Moderate GHSA-g3hv-75wg-m249, through the same Workbox path. The separate ESLint copy at `11.0.9` is not affected.

`bun audit fix --dry-run` checked 802 packages and fixed **0 of 4** findings because the parent ranges exclude the patched versions. No lockfile changes or out-of-range overrides were applied. Registry metadata checked on this date still reports `firebase@13.4.0` as latest, and its `@firebase/firestore@4.20.0` dependency still declares `@grpc/grpc-js: ~1.9.0`. Upstream [PR #10412](https://github.com/firebase/firebase-js-sdk/pull/10412) was merged on Nov 24 to update Firestore's range to `~1.14.7`, but that change is not in the latest published package checked. `vite-plugin-pwa@2.0.0` and `workbox-build@7.4.1` remain current and still pin `glob` to `^11.0.1`.

The Firebase CLI check reports **no authorized accounts** in this local environment. Firebase Console access remains available, but its AI Logic and App Check setup screens require a Project Owner to enable APIs/configure provider keys. See the task handoff report for live integration status.

**Current status:** dependency remediation remains open. The upstream gRPC fix is merged but unpublished; Workbox's `glob` / `minimatch` ranges also exclude fixed packages. Do not force overrides or declare the project security-clean. Recheck published versions and rerun both Bun audits before production readiness is reconsidered.

## Backend, database, and hosting readiness audit (2026-11-27)

- Work was performed on `hackathon/buildhybridai-2026-11-26`, HEAD `73deb94`, without modifying `main`, merging PR #4, deploying, or publishing rules.
- Repository rules are deny-by-default and validate owner-scoped metadata. The separate live rules inspection found the current live revision lacks the repository's two hazard/Stop-Work safeguards. This mismatch remains a production blocker; no live rule edit was made.
- Firebase Auth's Google provider is enabled in the inspected project. Client code requires a verified user for Firestore writes. Live Firebase App Check and Firebase AI Logic setup remain unavailable from the current Console role; they are not claimed active.
- Firestore documents contain only a subset of the in-memory application entities. The app does not read entity documents back into the workspace; only aggregate counts are queried. Do not call the full app cloud-restorable or multi-device ready.
- FieldProof image data remains in browser IndexedDB. The form now limits JPEG/PNG files to 10 MiB and states that Firestore stores metadata only. Original images, imported PDFs, and generated report PDFs are not remotely persisted.
- `vercel.json` prepares Vite static output and an SPA fallback. No API server, Admin SDK, private credential, or Vercel deployment exists.
- No-cost Firebase shared-quota constraints were preserved. Firestore backup is disabled; IndexedDB is not a backup. No paid service or billing was enabled.
- Full and production dependency audit remain at **1 High, 2 Moderate, 1 Low, 0 Critical** as described above. The high gRPC issue is not cleared.

**Readiness verdict:** partially ready for Vercel static deployment preparation only; not backend/database ready for production. See `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `BACKEND_API.md`, `VERCEL_DEPLOYMENT.md`, and `DATA_BACKUP_AND_RECOVERY.md` for the data-flow and limitations.

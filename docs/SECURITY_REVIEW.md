# Dependency security review

**Review date:** 2026-11-26  
**Scope:** Dependency audit evidence from the isolated npm trial for the repository's Firebase 13.4.0 dependency tree.

## Confirmed findings

The trial reported **4 High, 0 Critical, 0 Moderate, and 0 Low** findings. The same summary was returned by both the full audit and `npm audit --omit=dev`, so the findings are present in the production dependency graph.

The affected installed package chain was:

```text
firebase@13.4.0
└── @firebase/firestore@4.20.0
    └── @grpc/grpc-js@1.9.16
```

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

## Separate Workbox glob trial

An isolated Bun 1.4.5 trial verified that Workbox could resolve `glob@14.0.3` and load its CommonJS `globSync` export; the full local typecheck, lint, 32 unit tests, and Vite/PWA build passed. That override is not included in this change because the generated local `bun.lock` was not available to the GitHub review workflow for independent byte-for-byte review. The existing lockfile is therefore kept in sync with the repository's prior validated state rather than committing an unreviewed lockfile rewrite. The npm audit evidence did not report a separate `glob` or `minimatch` finding.

## Install-script policy

The isolated Bun trial used `bun install --ignore-scripts` and passed the project checks. CI uses the same setting. Dependencies whose install scripts were blocked remain untrusted until individually reviewed; they are not bulk-approved by this change.

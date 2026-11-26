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

## Remediation decision

npm suggested `firebase@9.14.0` as an available fix, but marked it as a SemVer-major change from the installed Firebase 13.x dependency. That downgrade was **not** applied because it may remove or break APIs used by the application, including the current Firebase AI Logic integration.

A direct override of `@grpc/grpc-js` to 1.13.6+ was also **not** applied. Firestore 4.20.0 declares `@grpc/grpc-js` as `~1.9.0`; forcing a release outside that range would bypass the SDK's declared compatibility constraint and requires a dedicated compatibility test.

A local browser-bundle text inspection did not find the literal identifiers `@grpc/grpc-js`, `grpc-js`, or `grpc_node` in generated browser JavaScript. This is useful context, but it does **not** clear the package-level audit finding or prove that every Node-targeted execution path is unreachable.

## Status

**Open — high-severity dependency remediation required.**

Before production release:

1. Check for a Firebase / Firestore SDK release whose declared gRPC dependency is patched.
2. If no compatible SDK release is available, isolate whether the affected Node gRPC transport is shipped or executed in any supported server/runtime path.
3. Test any proposed gRPC override against Firestore emulator authorization, authenticated sync, and production build.
4. Re-run full and production npm audits and record the exact lockfile and audit evidence.
5. Do not describe the repository as security-clean until the production audit is clean or a formally accepted, technically justified exception is recorded.

## Separate Workbox glob trial

An isolated Bun 1.4.5 trial verified that Workbox could resolve `glob@14.0.3` and load its CommonJS `globSync` export; the full local typecheck, lint, 32 unit tests, and Vite/PWA build passed. That override is not included in this change because the generated local `bun.lock` was not available to the GitHub review workflow for independent byte-for-byte review. The existing lockfile is therefore kept in sync with the repository's prior validated state rather than committing an unreviewed lockfile rewrite. The npm audit evidence did not report a separate `glob` or `minimatch` finding.

## Install-script policy

The isolated Bun trial used `bun install --ignore-scripts` and passed the project checks. CI uses the same setting. Dependencies whose install scripts were blocked remain untrusted until individually reviewed; they are not bulk-approved by this change.

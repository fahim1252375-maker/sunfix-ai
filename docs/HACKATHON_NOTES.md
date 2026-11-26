# #BuildHybridAI 2026 — Project Notes

## Verified repository history

- The public GitHub repository was created on 2026-11-25.
- The earliest reachable repository commit is dated 2026-11-25. There is no repository commit before the official submission period opened on 2026-11-11.
- GitHub PR #4, “Reinstate SunFix security, emulator and browser hardening,” is an open draft based on `main`. Its seven commits are dated 2026-11-26.
- The supplied source tree matches PR #4 head `df341631532b801f4f38201b526617d68d10cd39` exactly. The source directory has no `.git` metadata, so the commit association comes from the verified tree comparison, not from the archive itself.

This history supports saying that the repository contains substantial work committed during the submission period. It does not establish when any code outside this GitHub history was first created or used. Do not claim a pre-period creation date, earlier public usage, customers, deployments, or measured impact without separate evidence.

## Work recorded during the submission period

The repository history records the React/TypeScript solar field-workflow baseline and then security, privacy, quality, and test work. The restored PR #4 branch contains these November 26 additions over `main`:

- Reinstated the validated SunFix hardening after the preceding revert.
- Declared and documented supported Bun and Node versions, and aligned CI runtimes.
- Improved Playwright lifecycle capture and browser QA coverage.
- Recorded the Firebase Firestore/gRPC dependency findings and the upstream-release status.

The current hackathon branch adds:

- A Firebase AI Logic cloud fallback default of `gemini-3.5-flash-lite`.
- Explicit `UNAVAILABLE` attribution when a hybrid response does not report its source, with tests for local, cloud, and cloud-only attribution.
- A synchronized Bun lockfile, frozen CI installs, refreshed dependency-risk notes, and this time-boxed demo plan.
- A genuine-source-aware Firebase AI Logic fallback path, bounded requests, route-level lazy loading, and Linux CI proof for the desktop/mobile workflow.
- The existing Apache-2.0 terms in canonical form, with the copyright attribution retained in `NOTICE`.

These notes describe repository evidence, not a claim that every existing app feature originated during the contest.

## Submission prerequisites still open

- Configure and verify Firebase AI Logic and App Check for the actual Firebase Web app.
- Verify genuine Chrome Desktop local inference and Firebase cloud inference, each with recorded execution-source evidence.
- Re-record the successful Linux browser suite after any later code changes; the current verified CI run is linked in [TEST_PLAN.md](./TEST_PLAN.md).
- Record and publish an English YouTube demo of no more than three minutes.
- Configure the real Firebase project and demonstrate both inference sources before making live AI claims.
- Complete and submit the Devpost form with the public repository, test access instructions, project summary, and demo video, using the prepared copy in [DEVPOST_COPY.md](./DEVPOST_COPY.md).

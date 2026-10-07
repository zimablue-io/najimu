# Project Memory

Short, hand-curated facts the model should keep in mind on every session.
Real rules live in `.factory/rules/`. This file is the index + project-specific
nuggets that don't deserve a full rule file.

Cross-project personal memory lives in `~/.factory/memories.md` and is
injected automatically on session start.

## Active Constraints

See `.factory/rules/` for the canonical rules. This file only adds
project-specific constraints that don't yet deserve a full rule file.

- All hooks in this repo are wired in `.factory/settings.json` and
  `~/.factory/settings.json` (user-level). Universal hooks (SessionStart,
  UserPromptSubmit, Stop) are inherited from user level via Factory's
  extension-only merge.

## Known Stale Knowledge

- `pnpm-workspace.yaml` sets `allowBuilds.electron`. If Electron's `path.txt`
  is missing, `npx electron .` fails with "Electron failed to install
  correctly" even though `pnpm install` reports success. Fix by running
  `node install.js` inside
  `node_modules/.pnpm/electron@<ver>/node_modules/electron`.

## Past Decisions

- 2026-10-07 — Translation memory runs EmbeddingGemma 2 **in-process** via
  `@huggingface/transformers` in a `worker_threads` worker
  (`apps/desktop/electron/embedder/`). The user's constraint: no extra server
  for the user to start, and no blocking of Electron. This is why there are no
  embedding settings and no embedding URL — those were tried and rejected.
- 2026-10-07 — `onnxruntime-node` is set to `allowBuilds: false` because its
  Darwin/Linux/Win binaries ship inside the tarball; only the postinstall
  download is unwanted. Its binaries must also be in `build.asarUnpack`,
  because native `.node`/`.dylib` cannot load from inside an asar.
- 2026-10-07 — Package build scripts use `rm -rf dist && tsc`. Plain `tsc`
  never deletes output for removed sources, so deleted modules keep shipping
  from stale `dist` and break imports at runtime (this actually happened with
  `packages/core/dist/services/diff.js`).
- 2026-10-07 — Upgraded vitest 4 → 5 at root and in `packages/core`. Note
  `--reporter=basic` was removed upstream in v5; use the default reporter.
  v5 defaults `clearMocks: true`.

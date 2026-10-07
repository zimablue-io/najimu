# Project Memory

Hand-curated facts specific to Najimu. Cross-project rules and skills live in
`~/.agents`, not here.

## Known Stale Knowledge

- `pnpm-workspace.yaml` sets `allowBuilds.electron`. If Electron's `path.txt`
  is missing, `npx electron .` fails with "Electron failed to install
  correctly" even though `pnpm install` reports success. Fix by running
  `node install.js` inside
  `node_modules/.pnpm/electron@<ver>/node_modules/electron`.

## Past Decisions

- 2026-10-07 — Translation memory runs EmbeddingGemma 2 **in-process** via
  `@huggingface/transformers` in a `worker_threads` worker
  (`apps/desktop/electron/embedder/`). The constraint: no extra server for the
  user to start, and no blocking of Electron. This is why there are no
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
- 2026-10-07 — Renamed the project from `document-localizer` to **Najimu**
  (馴染む, "to fit in"). The landing site is `najimu.zimablue.io`. Landing URLs
  are declared once in `apps/landing/.env.example` (`VITE_SITE_URL`,
  `VITE_REPO_URL`) and resolved at build time; there is no second config file
  holding the same values.
- 2026-10-07 — `apps/landing` is typechecked with its own `tsc --noEmit`; its
  tsconfig covers `src`, `tests`, and `scripts`. The desktop tsconfig still
  covers only `src`, because adding its `tests` surfaces pre-existing errors in
  `tests/lib/similarity.test.ts`.

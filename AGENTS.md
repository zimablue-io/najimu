# Najimu - Agent Guide

## Quick Orientation

- **Project**: Electron desktop app for AI-powered document localization
- **Stack**: React 18 + TypeScript + Tailwind CSS v4 + Electron 33
- **Repo**: zimablue-io/najimu
- **Owner**: zimablue-io

## Task Routing

Read the guide for the tree you are editing before changing anything. The
closest one wins.

| What You Need | Go Here |
|---------------|---------|
| Dev setup | `docs/CONTRIBUTING.md` |
| Desktop app | `apps/desktop/AGENTS.md` |
| Landing page | `apps/landing/AGENTS.md` |
| Core logic | `packages/core/AGENTS.md` |
| UI components | `packages/ui/AGENTS.md` |
| License/legal | `LICENSE.md` |
| Privacy policy | `docs/PRIVACY.md` |
| Support info | `docs/SUPPORT.md` |
| Security policy | `docs/SECURITY.md` |
| Release process | `docs/RELEASES.md` |

## Key Constraints

These apply everywhere. Package-specific constraints live in the nested guides.

1. **Run tests before finishing**: `pnpm test`
2. **Use Biome for formatting**: `pnpm lint:fix`
3. **Test-first for bugs/features**: When fixing bugs or implementing features, write tests that FAIL before the fix, then PASS after. This prevents regressions and proves the fix works. Never claim "done" without tests verifying the behavior.
4. **Vitest green is not TypeScript green.** `tsc --noEmit` is a separate check; `apps/landing` needs its own run.
5. **No hardcoded hosts in the landing app.** Site and repo URLs come from `apps/landing/.env.example`.

## Standard Commands

```bash
pnpm install              # Install deps
pnpm dev:desktop          # Start desktop app (port 1420)
pnpm dev:landing          # Start landing page (port 1421)
pnpm build:desktop        # Build desktop app
pnpm build:landing        # Build landing page
pnpm test                 # Run all tests
pnpm lint:fix             # Format and lint
pnpm knip                 # Find dead code and unused exports
```

## Architecture Summary

**Desktop App**: Three-tab system (Uploaded → Tasks → Processed)
- User uploads PDF/.md files and selects locales
- Approved translations are retrieved from translation memory as terminology examples
- AI localizes paragraphs via a local LLM
- User reviews in a diff view and approves or rejects
- Approving records the translation into memory
- Exports approved output as Markdown or PDF

**Translation Memory**: EmbeddingGemma 2 runs in-process in a worker thread
- No embedding server, no configuration, no extra model for the user to start
- Model weights download once and cache under Electron `userData/models`
- If embeddings fail, translation continues without memory

**Landing Page**: Static marketing site at najimu.zimablue.io. No backend.

## Version Bumping

The GitHub Actions workflow handles version bumping automatically on push to
main. Do not manually bump versions. See `docs/RELEASES.md` for the full
process.

## Getting Unstuck

- For code questions: read the nearby files, follow existing patterns
- For architecture: see the nested `AGENTS.md` for that tree
- For patterns: check `biome.json` for formatting rules
- For install or build failures, see the matching nested guide

## Agent Notes

Facts that should hold for everyone belong here or in a nested `AGENTS.md`.
Anything that can be enforced should be a test or a linter rule, not prose.

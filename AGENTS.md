# Document Localizer - Agent Guide

## Quick Orientation

- **Project**: Electron desktop app for AI-powered document localization
- **Stack**: React 18 + TypeScript + Tailwind CSS v4 + Electron 33
- **Repo**: zimablue-io/document-localizer
- **Owner**: zimablue-io

## Task Routing

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

## Code Locations

```
apps/desktop/src/
├── App.tsx              # Main orchestrator
├── components/          # UI (Header, DocumentList, DiffView, SettingsModal...)
├── lib/                 # Business logic (locales.ts, prompts.ts, processing.ts...)
├── hooks/               # React hooks (useDocuments.ts)
└── types/               # TypeScript interfaces

apps/desktop/electron/
├── main.ts              # Electron main process, IPC handlers
└── preload.ts           # Context bridge

packages/core/src/
└── services/            # openai-client, file-processor, localize, diff
```

## Key Constraints

1. **Don't commit directly to main** - use feature branches, PRs
2. **Run tests before finishing**: `pnpm test`
3. **Use Biome for formatting**: `pnpm lint:fix`
4. **Settings stored in JSON files** - no database, no conf library
5. **All file ops go through IPC** - renderer has no direct fs access
6. **Test-first for bugs/features**: When fixing bugs or implementing features, write tests that FAIL before the fix, then PASS after. This prevents regressions and proves the fix works. Never claim "done" without tests verifying the behavior.

## Standard Commands

```bash
pnpm install              # Install deps
pnpm dev:desktop          # Start desktop app (port 1420)
pnpm dev:landing          # Start landing page (port 1421)
pnpm build:desktop        # Build desktop app
pnpm build:landing        # Build landing page
pnpm test                 # Run all tests
pnpm lint:fix             # Format and lint
```

## Architecture Summary

**Desktop App**: Three-tab system (Uploaded → Tasks → Processed)
- User uploads PDF/.md files
- Selects locales, clicks Process
- AI localizes chunks via local LLM
- User reviews in diff view, approves/rejects
- Exports approved as Markdown or PDF

**Landing Page**: Marketing site at https://document-localizer.vercel.app
- Hero with animated demo
- Features, How It Works, Setup Guide sections

## Modifying the Locale List

The **single source of truth** for locales is `apps/desktop/src/lib/locales.ts`.
The `ALL_LOCALES` array is exported from there - do NOT duplicate.

## Version Bumping

The GitHub Actions workflow handles version bumping automatically on push to main.
Do not manually bump versions. See `docs/RELEASES.md` for full release process details.

## Getting Unstuck

- For code questions: read the nearby files, follow existing patterns
- For architecture: see `AGENTS.md` architecture section
- For patterns: check `biome.json` for formatting rules

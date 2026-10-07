# Desktop App - Agent Guide

## Overview

Electron 33 desktop application for document localization. React frontend with IPC communication to main process.

## Architecture

```
apps/desktop/src/
├── App.tsx              # Main orchestrator (695 lines, delegating to components/hooks)
├── components/          # UI components
│   ├── DiffView.tsx     # Side-by-side review with word-level diff
│   ├── PromptList.tsx   # Saved prompt management
│   └── ...
├── lib/                 # Business logic
│   ├── locales.ts       # ALL_LOCALES (SSOT - don't duplicate!)
│   ├── prompts.ts       # Translation prompts
│   ├── processing.ts    # Document processing, cleanResponse, recordApprovedDocument
│   ├── embeddings.ts    # Translation-memory embed client (IPC only)
│   ├── similarity.ts    # Cosine similarity and retrieval
│   ├── memory.ts        # Approved translation memory entries and prompt context
│   ├── files.ts         # File utilities
│   ├── settings.ts      # Settings persistence
│   ├── config.ts        # Defaults and memory constants
│   └── types.ts         # TypeScript interfaces
├── hooks/
│   └── useDocuments.ts # Document state management
└── main.tsx             # React entry

apps/desktop/electron/
├── main.ts              # Main process, IPC handlers
├── preload.ts           # Context bridge (window.electron.*)
└── embedder/
    ├── index.ts         # Owns the embedder worker, batches requests
    └── worker.ts        # EmbeddingGemma 2 ONNX inference (worker thread)
```

## Three-Tab System

1. **Uploaded** - Source files, never change
2. **Tasks** - Active processing, awaiting review
3. **Processed** - Approved/rejected, ready to export

## IPC Handlers (main.ts)

| Handler | Purpose |
|---------|---------|
| `dialog:openFile` | Native file picker |
| `dialog:saveFile` | Native save dialog |
| `dialog:handleFileDrop` | Resolve dropped file paths |
| `dialog:validateFilePaths` | Validate paths before use |
| `fs:readFile` / `fs:readTextFile` | Read file contents |
| `fs:writeTextFile` / `fs:writeBase64File` | Write files |
| `settings:load` / `settings:save` | Settings JSON |
| `history:get/add/update/clear` | History persistence |
| `uploaded:load/save`, `tasks:load/save`, `processed:load/save` | Tab state |
| `prompts:list/read/write/delete` | Saved prompts |
| `ai:generate` | Chat completions via `net.fetch` |
| `ai:embed` | Embeddings via the embedder worker |
| `memory:load` / `memory:save` | Translation memory persistence |
| `test-connection` | Probe the configured chat server |
| `app:version`, `update:check` | Version and updates |
| `log` | Renderer-to-main logging |

## Translation Memory

Terminology consistency across documents, built in and not configurable.

- `ai:embed` runs EmbeddingGemma 2 **in-process** in a worker thread
  (`electron/embedder/`). There is no embedding server to configure or run.
- Inference never touches the Electron main or renderer thread, so the UI
  stays responsive while the model loads and embeds.
- Model weights download once from the Hugging Face hub on first use and are
  cached under Electron `userData/models`. No document content leaves the device.
- Only reviewer-approved paragraphs enter memory, via `recordApprovedDocument`
  at approval time.
- Retrieval is scoped to the exact source/target locale pair, thresholded by
  `MEMORY_SIMILARITY_THRESHOLD`, and capped by `MEMORY_MATCH_LIMIT`.
- **Reuse vs. retrieval are separate.** An approved paragraph that still
  matches the incoming text is reused directly and never reaches the model.
  Everything else gets approved examples added to its prompt.
  - Reuse is decided by comparing normalized text, never by embedding score.
    Measured against the real model, a paragraph with one clause added scores
    0.985 cosine against the text it differs from, so no similarity threshold
    separates "same paragraph" from "same paragraph plus a clause".
  - Paragraphs shorter than five words are never reused automatically, since
    short strings are context dependent.
- Paragraphs are embedded in one batched call per document, not one per
  paragraph.
- If embedding is unavailable, translation continues without memory rather
  than failing the document.

## Settings Storage

Located in `~/Library/Application Support/Najimu/`:
- `settings.json` - App configuration
- `history.json` - Processing history
- `uploaded.json` - Source document library
- `tasks.json` - Active processing tasks
- `processed.json` - Completed outputs
- `memory.json` - Approved translation memory
- `prompts/` - Saved prompts

## Key Constraints

1. **All file ops through IPC** - Renderer has no direct fs access
2. **Dev detection**: Use `app.isPackaged` (not `development` constant)
3. **PDF parsing in renderer** - via `docutext/browser`
4. **AI calls use net.fetch** - Chromium's built-in networking
5. **Settings in JSON** - No conf library
6. **Heavy inference belongs in a worker thread** - never on a UI or main thread
7. **Native binaries must be unpacked** - `build.asarUnpack` covers `onnxruntime-node`

## Important Patterns

### Locale List
Single source of truth: `lib/locales.ts` exports `ALL_LOCALES`.
Do NOT duplicate locale definitions elsewhere.

### Paragraph Splitting
All paragraph splitting goes through `splitParagraphs` in `lib/memory.ts`.
The embedder and the memory-entry builder must derive paragraphs from the
same function, or a vector gets paired with the wrong paragraph.

### Processing Flow
1. Upload file → `uploaded.json`
2. Click Process → creates new Task
3. Parse text (PDF via docutext, MD via IPC)
4. Split into paragraphs
5. Retrieve approved translations for each paragraph's locale pair
6. Send prompt (with any approved examples) to AI via `ai:generate`
7. Show in DiffView for review
8. User approves → record approved paragraphs into memory → `processed.json`

## Dev Commands

```bash
cd apps/desktop && pnpm dev          # Full dev with Electron
cd apps/desktop && pnpm dev:web      # Web preview only
pnpm build:desktop                   # Production build
pnpm electron:build                  # electron-builder (creates .dmg)
```

## Tests

```bash
cd apps/desktop && pnpm exec vitest run tests
```

Tests live in `apps/desktop/tests/` and run from the root suite via
`pnpm test`. No test may skip or return early when a fixture is missing.

# @doclocalizer/desktop

Electron desktop application for document localization.

## Overview

Cross-platform desktop app that localizes documents between any supported locale pair using local AI models. Document content never leaves your machine.

## Features

- **File Support**: PDF and Markdown files
- **AI Localization**: Uses local LLMs via OpenAI-compatible API (Ollama, LM Studio, llama.cpp)
- **Translation Memory**: Reuses your approved translations for consistent terminology. EmbeddingGemma 2 runs in-process, so there is no extra server to start.
- **Review System**: Side-by-side diff view with paragraph-level editing
- **Export**: Save localized documents as Markdown or PDF
- **Three-Tab System**:
  - **Uploaded**: Source library (permanent files, never modified)
  - **Tasks**: Active processing (parsing, localizing, review)
  - **Processed**: Completed outputs (approved, rejected, exported)

## Tech Stack

- Electron 33
- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- docutext (PDF parsing in renderer)
- @huggingface/transformers (in-process embeddings, worker thread)
- @doclocalizer/core (shared business logic)
- @doclocalizer/ui (shared UI components)

## Development

```bash
# Start desktop app (requires core and ui packages built first)
pnpm dev

# Build for production
pnpm build

# Electron-specific build
pnpm electron:build
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Build packages + start Electron dev mode |
| `pnpm dev:web` | Start Vite dev server only (port 1420) |
| `pnpm build` | Build packages + Vite + Electron |
| `pnpm electron:build` | Build packaged app with electron-builder |
| `pnpm preview` | Preview production build |

## Architecture

```
apps/desktop/
├── src/
│   ├── App.tsx              # Main app (orchestration only)
│   ├── main.tsx             # React entry point
│   ├── components/
│   │   ├── Header.tsx       # Top bar with model selector
│   │   ├── DocumentList.tsx  # Three-tab document list
│   │   ├── DiffView.tsx      # Side-by-side diff with editing
│   │   ├── SettingsModal.tsx # API, model, locale settings
│   │   ├── HistoryPanel.tsx  # Processing history
│   │   ├── PromptList.tsx    # Saved prompt management
│   │   ├── PromptEditor.tsx  # Prompt editing
│   │   ├── PromptCreateForm.tsx # New prompt creation
│   │   ├── EmptyState.tsx    # Initial upload prompt
│   │   └── document-helpers.tsx  # Status icons, locale selects
│   ├── lib/
│   │   ├── processing.ts     # Document pipeline + cleanResponse
│   │   ├── prompts.ts        # Prompt templates
│   │   ├── locales.ts        # ALL_LOCALES (single source of truth)
│   │   ├── embeddings.ts     # Embedding client over IPC
│   │   ├── similarity.ts     # Cosine similarity and retrieval
│   │   ├── memory.ts         # Approved translation memory
│   │   ├── files.ts          # File utilities
│   │   ├── settings.ts       # Settings persistence
│   │   ├── config.ts         # Defaults and memory constants
│   │   ├── export.ts         # PDF generation (jsPDF)
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── utils.ts          # Error formatting, helpers
│   ├── hooks/
│   │   └── useDocuments.ts   # Document state management
│   └── types/
│       └── electron.d.ts     # TypeScript declarations
├── electron/
│   ├── main.ts              # Main process (IPC handlers)
│   ├── preload.ts           # Context bridge
│   └── embedder/
│       ├── index.ts         # Embedder worker lifecycle
│       └── worker.ts        # EmbeddingGemma 2 inference (worker thread)
└── dist-electron/          # Compiled Electron (auto-generated)
```

## Electron IPC

Bridge methods on `window.electron.*` map to these channels:

| Channel | Description |
|---------|-------------|
| `dialog:openFile` | Open native file dialog (multiple files) |
| `dialog:saveFile` | Save dialog for export |
| `fs:readFile` / `fs:readTextFile` | Read file contents |
| `fs:writeTextFile` / `fs:writeBase64File` | Write files |
| `settings:load` / `settings:save` | Persist settings |
| `uploaded:load/save`, `tasks:load/save`, `processed:load/save` | Tab state |
| `history:get/add/update/clear` | Processing history |
| `prompts:list/read/write/delete` | Saved prompts |
| `ai:generate` | Call AI API via net.fetch |
| `ai:embed` | Embed text via the embedder worker |
| `memory:load` / `memory:save` | Approved translation memory |

## Translation Memory

Approved paragraphs are embedded with EmbeddingGemma 2 and stored locally.
On later documents, approved translations are reused where the source text
still matches, and the closest approved translations for the same locale pair
are otherwise added to the prompt as terminology examples.

- An approved paragraph that still matches is reused directly, without a model call.
- Reuse compares the text itself, not the embedding score, so a changed
  paragraph is never silently reused.
- Paragraphs under five words are always re-checked rather than reused.
- Runs in a worker thread, so the UI never blocks during inference.
- Model weights download once and are cached under `userData/models`.
- If embeddings are unavailable, translation continues without memory.

## Settings Storage

Stored in `~/Library/Application Support/document-localizer/`:
- `settings.json` - API URL, models, chunk size, locales
- `uploaded.json` - Source file library
- `tasks.json` - Active processing tasks
- `processed.json` - Completed outputs
- `history.json` - Processing history
- `memory.json` - Approved translation memory
- `prompts/` - Saved prompts

## Port

Vite dev server runs on **http://localhost:1420**

## Notes

- App.tsx is the orchestrator - all UI is in components/
- PDF parsing happens in renderer via docutext/browser
- All AI calls use Chromium's built-in net.fetch
- No direct filesystem access in renderer - all via IPC

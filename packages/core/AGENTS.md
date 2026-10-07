# Core Package - Agent Guide

## Overview

Shared business logic for document localization. Browser-compatible: nothing in
the built output may reach for a Node.js API.

## Modules

```
packages/core/src/
├── index.ts               # Public barrel export
├── types.ts               # Shared TypeScript interfaces
├── services/
│   ├── openai-client.ts   # LLM API calls (OpenAI-compatible)
│   ├── file-processor.ts  # PDF/MD parsing
│   ├── pdf.ts             # PDF to markdown conversion (DocuText)
│   ├── localize.ts        # Localization logic
│   └── process-document.ts # Single-document parse + localize pipeline
└── utils/
    ├── chunk.ts           # chunkText
    └── chunk-manager.ts   # Chunk state and progress helpers
```

`index.ts` re-exports every module above. Export from there, not from an
internal path.

## Services

### openai-client
- Calls the configured OpenAI-compatible endpoint (Ollama, LM Studio, llama.cpp)
- Handles streaming responses

### file-processor
- PDF parsing via docutext/browser
- Markdown parsing
- Returns plain text for localization

### localize
- Builds prompts from templates
- Processes chunks through the AI client
- Combines results

### process-document
- Single entry point for parse-then-localize

## Chunking

`chunkText(text, maxChunkSize, overlapSize)` splits text into overlapping
chunks. **Both sizes are required arguments** — there are no built-in defaults,
so the caller chooses them. Overlap preserves context across a chunk boundary.

`chunk-manager.ts` tracks chunk state for the desktop app: creation and status
updates, progress percentage, the next pending chunk, reset of failed chunks,
combining localized output, and aggregate stats.

Note that the desktop app does **not** use `chunkText`. It splits paragraphs
through `splitParagraphs` in `apps/desktop/src/lib/memory.ts` instead, so the
text embedded for translation memory and the text sent to the model stay aligned.
Do not route desktop paragraph splitting through this package.

## Browser Compatibility

- No `fs` module
- No Node.js built-ins
- Use browser-compatible alternatives

## Dev Commands

```bash
cd packages/core && pnpm build    # rm -rf dist && tsc
cd packages/core && pnpm test     # vitest
```

`build` must keep the `rm -rf dist` prefix. Plain `tsc` never deletes output for
a removed source, so deleted modules keep shipping from a stale `dist` and break
imports at runtime. This already happened with `dist/services/diff.js`.

Tests live in `src/__tests__/` and run from the root suite via `pnpm test`.

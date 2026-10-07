# Core Package - Agent Guide

## Overview

Shared business logic for document localization. Browser-compatible (no Node.js APIs in dist).

## Services

```
packages/core/src/
├── index.ts               # Public barrel export
├── types.ts               # Shared TypeScript interfaces
├── services/
│   ├── openai-client.ts     # LLM API calls (OpenAI-compatible)
│   ├── file-processor.ts    # PDF/MD parsing
│   ├── pdf.ts               # PDF to markdown conversion (DocuText)
│   ├── localize.ts          # Localization logic
│   └── process-document.ts  # Single-document parse + localize pipeline
└── utils/
    └── chunk.ts             # Text chunking
```

## Key Services

### openai-client
- Sends text chunks to local LLM
- OpenAI-compatible API (Ollama, LM Studio, llama.cpp)
- Handles streaming responses

### file-processor
- PDF parsing via docutext/browser
- Markdown parsing (simple split)
- Returns plain text for localization

### localize
- Builds prompts from templates
- Processes chunks through AI
- Combines results

### diff
- Generates word-level diffs
- Detects changed words

## Chunk Processing

Documents are split into chunks for AI processing:
- Default chunk size: 1000 characters
- Overlap: 100 characters (to preserve context)

## Browser Compatibility

- No `fs` module
- No Node.js built-ins
- Use browser-compatible alternatives

## Dev Commands

```bash
cd packages/core && pnpm build    # TypeScript compile
cd packages/core && pnpm test    # Run tests
```

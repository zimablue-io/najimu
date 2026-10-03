# Document Localizer

A monorepo for document localization using AI.

## Quick Start

```bash
pnpm install
pnpm dev:desktop   # Start desktop app
pnpm dev:landing    # Start landing page
```

## Architecture

```
├── apps/
│   ├── desktop/          # Electron desktop app (Vite, port 1420)
│   └── landing/          # Marketing landing page (Vite, port 1421)
├── packages/
│   ├── core/             # Shared business logic
│   └── ui/               # Shared UI components
```

## Apps

### @doclocalizer/desktop
Electron desktop application for document localization:
- PDF and Markdown file processing
- AI-powered localization via local LLMs (Ollama, LM Studio, llama.cpp)
- Side-by-side diff view with paragraph editing
- Three-tab system: Uploaded (source library) → Tasks (processing) → Processed (completed)
- Export to Markdown or PDF

### @doclocalizer/landing
Marketing landing page at http://localhost:1421:
- Hero section with animated transformation demo
- Features section (5 cards)
- Interactive StepViewer with app screenshots
- SetupGuide with tabs for Ollama, LM Studio, and llama.cpp
- Floating navigation sidebar

## Packages

### @doclocalizer/core
Core business logic for document localization:
- PDF to Markdown conversion (pdfjs-dist)
- Text chunking for LLM processing
- OpenAI-compatible API client
- Diff generation for review

### @doclocalizer/ui
Shared UI components:
- Button, Input, Dialog, Select, Tabs
- ScrollArea, AlertDialog, Sheet
- Built with Tailwind CSS v4

## Scripts

```bash
# Install dependencies
pnpm install

# Development - Desktop
pnpm dev:desktop

# Development - Landing
pnpm dev:landing

# Build
pnpm build:core        # Build core package
pnpm build:landing     # Build landing page
pnpm build:desktop     # Build desktop app

# Lint
pnpm lint
```

## Development

```bash
# Start desktop app
cd apps/desktop && pnpm dev

# Start landing page
cd apps/landing && pnpm dev

# Build core package
cd packages/core && pnpm build
```

## Documentation

| Topic | Location |
|-------|----------|
| Contributing | [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) |
| License | [LICENSE.md](./LICENSE.md) |
| Privacy Policy | [docs/PRIVACY.md](./docs/PRIVACY.md) |
| Support | [docs/SUPPORT.md](./docs/SUPPORT.md) |
| Security | [docs/SECURITY.md](./docs/SECURITY.md) |

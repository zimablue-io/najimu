# @najimu/landing

Marketing landing page for Najimu.

## Overview

Single-page React application showcasing the Najimu desktop app. Features an animated hero section, feature highlights, interactive step-by-step guide, and LLM setup instructions.

## Sections

- **Hero**: Animated demo showing American→British English transformation with floating document icons
- **Features**: 5 feature cards (Private, AI-Powered, You Control, PDF & Markdown, Open Source)
- **How It Works (StepViewer)**: Vertical tabs with scroll-driven navigation and app screenshots
- **Setup Guide**: Horizontal tabs for Ollama, LM Studio, and llama.cpp setup instructions
- **Navigation**: Floating sidebar with hover-expand labels

## Tech Stack

- React 18 + TypeScript
- Vite 8
- Tailwind CSS v4
- Lucide React icons

## Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 1421 |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |

## File Structure

```
apps/landing/
├── src/
│   ├── App.tsx              # Main app (orchestration only)
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles + animations
│   ├── components/
│   │   ├── Hero.tsx         # Hero section with animated demo
│   │   ├── Features.tsx     # Feature cards
│   │   ├── StepViewer.tsx   # Interactive steps (replaces HowItWorks)
│   │   ├── SetupGuide.tsx   # LLM setup tabs (replaces Requirements)
│   │   ├── Navigation.tsx     # Floating sidebar nav
│   │   ├── Footer.tsx
│   │   └── Icons.tsx        # Custom SVG icons (GitHub)
│   └── hooks/
│       └── useActiveSection.ts  # Scroll spy for nav highlighting
├── public/images/           # App screenshots for StepViewer
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

## Port

Dev server runs on **http://localhost:1421**

## Notes

- App.tsx is the orchestrator - all sections are separate components
- Navigation auto-highlights based on scroll position via IntersectionObserver
- CSS animations defined in index.css (float, pulse, glow, etc.)
- No routing needed - single page application

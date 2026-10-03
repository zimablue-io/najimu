# Landing Page - Agent Guide

## Overview

Static marketing site (React + Vite). No backend, no authentication. Mobile-responsive.

## Components

```
apps/landing/src/
├── App.tsx              # Orchestrator
├── components/
│   ├── Hero.tsx        # Hero section with animated demo
│   ├── Features.tsx    # 5 feature cards
│   ├── StepViewer.tsx  # How It Works (scroll-driven desktop, tabs mobile)
│   ├── SetupGuide.tsx  # LLM setup instructions (tabs: Ollama, LM Studio, llama.cpp)
│   ├── Navigation.tsx  # Sidebar nav (desktop), hamburger (mobile)
│   └── Footer.tsx       # Footer
└── hooks/
    └── useActiveSection.ts  # Scroll-based section tracking
```

## Responsive Strategy

| Component | Desktop | Mobile |
|-----------|---------|---------|
| Navigation | Fixed sidebar left | Hamburger menu top-right |
| Hero | 2-column grid | Stacked, centered |
| Features | 5-column grid | 2-column grid |
| StepViewer | Sidebar + scroll | Horizontal tabs |

- Use `md:` breakpoint for desktop styles
- Use `hidden md:flex` to hide/show
- Mobile-first approach

## Platform Detection

`hooks/usePlatform.ts` detects user platform:
- `macos` → Active download button
- Other → Disabled button "Currently available for macOS only"

## Static Files

```
apps/landing/public/
├── images/           # App screenshots
├── robots.txt        # SEO
├── sitemap.xml       # SEO
├── llms.txt          # AI crawler summary
└── favicon.svg       # Site favicon
```

## Dev Commands

```bash
cd apps/landing && pnpm dev     # Dev server (port 1421)
pnpm build:landing              # Production build
```

## Key Constraints

1. **Static site only** - No API calls, no server
2. **Build copies public/** to dist/
3. **Vercel Analytics and Speed Insights** - Only on the landing page, not the desktop app. Download clicks call `track('Download click', { platform })`.

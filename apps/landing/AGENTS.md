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

`hooks/usePlatform.ts` reads the browser and `lib/machine.ts` decides the download:
- Windows → Windows installer
- Linux → Linux AppImage
- Apple silicon Mac → Apple silicon disk, including when the user agent still says "Intel Mac OS X"
- Intel Mac → Intel disk, from client hints or the GPU renderer
- Phone, tablet, or anything else → the download button stays inactive until the visitor picks a desktop build from the menu beside it
- That menu lists the other builds. It sits next to the detected download button and does not move the hero when it opens

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
3. **Vercel Analytics and Speed Insights** - Only on the landing page, not the desktop app. Download clicks call `track('Download click', { platform, arch })` and open the stable release asset for that platform.

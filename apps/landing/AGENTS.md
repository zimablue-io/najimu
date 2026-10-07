# Landing Page - Agent Guide

## Overview

Static marketing site (React + Vite). No backend, no authentication. Mobile-responsive.

## Components

```
apps/landing/src/
├── App.tsx              # Orchestrator
├── components/
│   ├── hero/
│   │   ├── Hero.tsx     # Hero section with animated demo
│   │   ├── LocaleDemo.tsx  # Side-by-side diff animation
│   │   └── examples.ts  # The three demo locale pairs
│   ├── Features.tsx    # 5 feature cards
│   ├── StepViewer.tsx  # How It Works (scroll-driven desktop, tabs mobile)
│   ├── SetupGuide.tsx  # LLM setup instructions (tabs: Ollama, LM Studio, llama.cpp)
│   ├── UseCases.tsx
│   ├── VsCompetitors.tsx
│   ├── Navigation.tsx  # Sidebar nav (desktop), hamburger (mobile)
│   └── Footer.tsx
├── hooks/
│   └── useActiveSection.ts  # Scroll-based section tracking
├── lib/
│   └── site.ts         # SITE_URL / REPO_URL / releasesUrl / licenseUrl
└── scripts/
    └── render-seo.mjs  # Renders seo/ into public/ before dev and build
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
- `macos`, `windows`, `linux` → Active download button
- Other → Disabled button

## Site URLs come from .env.example

`apps/landing/.env.example` is the single declared list of environment variables
the landing site reads. It carries the production values, so a fresh clone builds
correctly with no `.env` present.

| Variable | Purpose |
|---|---|
| `VITE_SITE_URL` | Origin the landing site is served from |
| `VITE_REPO_URL` | Repository root, without a trailing slash |

It is consumed in three places:

| Consumer | How it reads them |
|---|---|
| `index.html` | Vite's `%VITE_*%` substitution, seeded by `define` in `vite.config.ts` |
| `seo/*` → `public/` | `scripts/render-seo.mjs`, which runs before `dev` and `build` |
| React components | `lib/site.ts` (`SITE_URL`, `REPO_URL`, `releasesUrl`, `licenseUrl`) |

Rules:

1. **Never hardcode a host** in `src/` or `index.html`. Read it from `lib/site.ts`.
2. **Add a new variable to `.env.example`**, one entry per variable, with its
   purpose. That file is the only place the values are declared.
3. **Precedence**, lowest to highest: `.env.example` → `.env` → `.env.local` →
   real environment variables (what CI and Vercel set for a preview deploy).
4. **An unresolved placeholder throws** in `render-seo.mjs` rather than shipping a
   literal `%VITE_SITE_URL%` into a sitemap. Vite itself only warns, so the script
   is the guard for the SEO files.
5. Only `%VITE_[A-Z0-9_]+%` is treated as a placeholder, so percent-encoded URL
   segments like `step%201%20-%20uploaded.png` survive rendering.

## Static Files

```
apps/landing/seo/         # Templates, committed
├── sitemap.xml
├── robots.txt
├── llms.txt
└── manifest.webmanifest

apps/landing/public/      # Rendered from seo/ (gitignored) plus committed assets
├── images/               # App screenshots
├── favicon.svg
└── apple-touch-icon.png
```

## Dev Commands

```bash
cd apps/landing && pnpm dev     # Renders SEO files, then dev server (port 1421)
pnpm --filter @najimu/landing seo  # Re-render the SEO files only
pnpm build:landing              # Production build
```

## Key Constraints

1. **Static site only** - No API calls, no server
2. **Build copies public/** to dist/
3. **Vercel Analytics and Speed Insights** - Only on landing page, not desktop app
4. **Marketing copy is tested** - `tests/marketing-claims.test.ts` asserts every
   capability claim against the code that implements it. Do not add a claim the
   implementation cannot back.

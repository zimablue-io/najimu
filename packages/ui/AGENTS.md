# UI Package - Agent Guide

## Overview

Shared React component library. Built with Tailwind CSS v4. Components follow
shadcn/ui conventions: copy the file and edit it rather than adding props.

## Components

```
packages/ui/src/
├── index.ts           # Main exports
├── index.css          # Tailwind imports
└── components/
    └── ui/
        ├── accordion.tsx
        ├── alert-dialog.tsx
        ├── button.tsx
        ├── card.tsx
        ├── dialog.tsx
        ├── input.tsx
        ├── label.tsx
        ├── scroll-area.tsx
        ├── select.tsx
        ├── sheet.tsx
        ├── sonner.tsx
        └── tabs.tsx
```

## Usage

```tsx
import { Button } from '@najimu/ui'
import '@najimu/ui/index.css'
```

## Tailwind v4

- Uses the `@tailwindcss/vite` plugin
- CSS-first configuration in `index.css`
- No `tailwind.config.js`

## Patterns

- Variants via `class-variance-authority`
- `clsx` and `tailwind-merge` for className handling
- Radix UI primitives underneath, for accessible behavior

When adding a component, copy the closest existing one and adapt it. These files
are meant to be edited in place, not wrapped in configuration.

## Dev Commands

```bash
cd packages/ui && pnpm build    # rm -rf dist && tsc
```

`build` must keep the `rm -rf dist` prefix, for the reason described in
`packages/core/AGENTS.md`.

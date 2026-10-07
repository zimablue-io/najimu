# UI Package - Agent Guide

## Overview

Shared React component library. Built with Tailwind CSS v4.

## Components

```
packages/ui/src/
├── index.ts           # Main exports
├── index.css         # Tailwind imports
└── components/
    └── ui/           # Base components
        ├── button.tsx
        ├── input.tsx
        ├── dialog.tsx
        ├── select.tsx
        ├── tabs.tsx
        ├── scroll-area.tsx
        └── index.ts   # Re-exports
```

## Usage

```tsx
import { Button } from '@najimu/ui'
import '@najimu/ui/index.css'
```

## Tailwind v4

- Uses `@tailwindcss/vite` plugin
- CSS-first configuration in `index.css`
- No tailwind.config.js

## Patterns

- Components use `class-variance-authority` for variants
- Uses `clsx` and `tailwind-merge` for className handling
- Follows Radix UI patterns for accessible components

## Dev Commands

```bash
cd packages/ui && pnpm build    # TypeScript compile
```

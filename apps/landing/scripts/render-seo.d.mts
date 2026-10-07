/**
 * Types for `render-seo.mjs`, which runs as a plain Node script before dev and
 * build. Declaring them here keeps the test import typed instead of `any`.
 */

/** Environment variables the SEO templates may reference. */
export type SeoEnv = Record<string, string | undefined>

/**
 * Substitutes `%VITE_*%` placeholders in a template. Throws when a referenced
 * variable is unset, so a literal placeholder never reaches a crawler.
 */
export function renderSeoTemplate(source: string, env: SeoEnv): string

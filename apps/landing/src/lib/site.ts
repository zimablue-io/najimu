/**
 * Public URLs for the landing site.
 *
 * `VITE_SITE_URL` and `VITE_REPO_URL` are declared in `.env.example` and injected
 * at build time by `vite.config.ts`, so they are defined in any built bundle. A
 * local `.env` or a real environment variable overrides those defaults.
 *
 * The same two values are substituted into `index.html` by Vite, and rendered into
 * `apps/landing/public/` from the `seo/` templates by `scripts/render-seo.mjs`.
 */

function trimTrailingSlash(url: string): string {
	return url.replace(/\/$/, '')
}

export const SITE_URL = trimTrailingSlash(import.meta.env.VITE_SITE_URL)
export const REPO_URL = trimTrailingSlash(import.meta.env.VITE_REPO_URL)

export const releasesUrl = `${REPO_URL}/releases/latest`
export const licenseUrl = `${REPO_URL}/blob/main/LICENSE.md`
export const privacyUrl = `${REPO_URL}/blob/main/docs/PRIVACY.md`

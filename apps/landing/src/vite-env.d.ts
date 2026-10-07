/// <reference types="vite/client" />

/**
 * The variables the landing site reads, declared in `.env.example`.
 * `vite.config.ts` seeds them at build time, so they are always defined in a
 * built bundle and are typed as `string` rather than optional.
 */
interface ImportMetaEnv {
	readonly VITE_SITE_URL: string
	readonly VITE_REPO_URL: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

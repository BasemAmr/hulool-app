/// <reference types='vite/client' />

interface ImportMetaEnv {
  /** WordPress tm/v1 REST base (e.g. http://localhost/site/wp-json/tm/v1) */
  readonly VITE_API_BASE_URL?: string;
  /** WordPress site origin for media uploads (no trailing slash) */
  readonly VITE_API_MEDIA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

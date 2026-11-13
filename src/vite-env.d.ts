/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM?: 'mock' | 'bridge';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

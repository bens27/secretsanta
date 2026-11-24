/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

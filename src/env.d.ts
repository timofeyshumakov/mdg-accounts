/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module 'vue-the-mask' {
  import type { Plugin } from 'vue';
  const VueTheMask: Plugin;
  export default VueTheMask;
}

export interface Bx24Auth {
  domain?: string;
  access_token?: string;
  refresh_token?: string;
  member_id?: string;
}

export interface Bx24CallResult {
  error: () => unknown;
  data: () => unknown;
  total?: () => number;
  more?: () => boolean;
  next?: () => void;
}

export interface Bx24Api {
  ready?: (callback: () => void) => void;
  init?: (callback?: () => void) => void;
  callMethod?: (
    method: string,
    params: Record<string, unknown>,
    callback: (result: Bx24CallResult) => void,
  ) => void;
  getAuth?: () => Bx24Auth | null;
  openPath?: (path: string, callback?: (result: { result?: string; errorCode?: string }) => void) => void;
}

declare global {
  interface Window {
    BX24?: Bx24Api;
  }

  // eslint-disable-next-line no-var
  var BX24: Bx24Api | undefined;
}

export {};

import type { Bx24Api } from '../../../env.d';
import { getBx24, hasBx24CallMethod } from './bitrixClient';

const BX24_API_WAIT_MS = 15000;

let bx24ReadyPromise: Promise<void> | null = null;

function waitForBx24Api(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (hasBx24CallMethod()) {
      resolve(true);
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (hasBx24CallMethod()) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }

      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

function runBx24Init(bx24: Bx24Api, callback: () => void): void {
  if (typeof bx24.init === 'function') {
    bx24.init(callback);
    return;
  }

  callback();
}

export function ensureBx24Ready(): Promise<void> {
  if (!bx24ReadyPromise) {
    bx24ReadyPromise = (async () => {
      const hasApi = await waitForBx24Api(BX24_API_WAIT_MS);
      if (!hasApi) {
        console.warn('BX24 API недоступен — приложение запущено вне Bitrix24');
        return;
      }

      const bx24 = getBx24();
      if (!bx24) {
        return;
      }

      await new Promise<void>((resolve) => {
        const start = () => runBx24Init(bx24, resolve);

        if (typeof bx24.ready === 'function') {
          bx24.ready(start);
          return;
        }

        start();
      });
    })();
  }

  return bx24ReadyPromise;
}

export function runWhenBx24Ready<T>(callback: () => Promise<T> | T): Promise<T> {
  return ensureBx24Ready().then(callback);
}

/** Сброс singleton — только для тестов. */
export function resetBx24ReadyForTests(): void {
  bx24ReadyPromise = null;
}

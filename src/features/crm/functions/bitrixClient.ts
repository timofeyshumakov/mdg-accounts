import type { Bx24Api } from '../../../env.d';

export function getBx24(): Bx24Api | undefined {
  if (typeof BX24 !== 'undefined' && BX24) {
    return BX24;
  }

  return window.BX24;
}

export function getBx24WithOpenPath(): Bx24Api | undefined {
  const bx24 = getBx24();
  return typeof bx24?.openPath === 'function' ? bx24 : undefined;
}

export function hasBx24CallMethod(): boolean {
  return typeof getBx24()?.callMethod === 'function';
}

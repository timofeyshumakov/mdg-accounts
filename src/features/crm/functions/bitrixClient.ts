import type { Bx24Api } from '../../../env.d';

function readBx24FromWindow(target: Window | null | undefined): Bx24Api | undefined {
  if (!target) {
    return undefined;
  }

  try {
    const bx24 = target.BX24;
    return bx24 ?? undefined;
  } catch {
    return undefined;
  }
}

export function getBx24(): Bx24Api | undefined {
  if (typeof BX24 !== 'undefined' && BX24) {
    return BX24;
  }

  return readBx24FromWindow(window)
    ?? readBx24FromWindow(window.parent)
    ?? readBx24FromWindow(window.top);
}

export function getBx24WithOpenPath(): Bx24Api | undefined {
  const bx24 = getBx24();
  return typeof bx24?.openPath === 'function' ? bx24 : undefined;
}

export function hasBx24CallMethod(): boolean {
  return typeof getBx24()?.callMethod === 'function';
}

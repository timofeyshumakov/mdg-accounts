import { describe, expect, it, vi, afterEach } from 'vitest';
import { getBx24, getBx24WithOpenPath } from '../features/crm/functions/bitrixClient';

describe('bitrixClient', () => {
  afterEach(() => {
    delete (globalThis as { BX24?: unknown }).BX24;
    delete (window as { BX24?: unknown }).BX24;
  });

  it('uses global BX24 when window.BX24 is missing', () => {
    const callMethod = vi.fn();
    (globalThis as { BX24: unknown }).BX24 = { callMethod };

    expect(getBx24()?.callMethod).toBe(callMethod);
  });

  it('ignores cross-origin parent window access errors', () => {
    const openPath = vi.fn();
    (window as { BX24?: unknown }).BX24 = { openPath };

    const parentDescriptor = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', {
      configurable: true,
      get() {
        throw new DOMException('Blocked a frame with origin', 'SecurityError');
      },
    });

    expect(getBx24()?.openPath).toBe(openPath);
    expect(getBx24WithOpenPath()?.openPath).toBe(openPath);

    if (parentDescriptor) {
      Object.defineProperty(window, 'parent', parentDescriptor);
    }
  });
});
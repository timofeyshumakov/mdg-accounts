import { describe, expect, it, vi, afterEach } from 'vitest';
import { getBx24 } from '../features/crm/functions/bitrixClient';

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
});

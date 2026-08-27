import { describe, expect, it } from 'vitest';
import { resolvePartnerTypeId } from '../features/crm/functions/monthlyReport';

describe('resolvePartnerTypeId', () => {
  const labelMap = new Map([
    ['11918', 'Действующий'],
    ['11888', 'Новый'],
    ['11880', 'Постоянный'],
    ['11882', 'Хороший'],
  ]);

  it('maps Действующий / Новый from relation status field', () => {
    expect(resolvePartnerTypeId('11918', labelMap)).toBe('active');
    expect(resolvePartnerTypeId('11888', labelMap)).toBe('new');
    expect(resolvePartnerTypeId('11880', labelMap)).toBe('');
    expect(resolvePartnerTypeId('', labelMap)).toBe('');
  });
});

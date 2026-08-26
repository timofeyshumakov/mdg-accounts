import { describe, expect, it } from 'vitest';
import {
  filterMonthlyReportRows,
  monthlyReportMockRows,
  recountChips,
  PARTNER_TYPE_CHIPS,
} from '../features/crm/mock/monthlyReportData';

describe('monthlyReportData', () => {
  it('filters rows by search and partner type', () => {
    const rows = filterMonthlyReportRows(monthlyReportMockRows, {
      search: 'ромашка',
      assignedIds: [],
      months: [],
      years: [],
      partnerTypes: ['new'],
      relationStatuses: [],
      currentStatuses: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].partnerName).toContain('Иванов');
  });

  it('recounts partner type chips from rows', () => {
    const chips = recountChips(monthlyReportMockRows, PARTNER_TYPE_CHIPS, 'partnerTypeId');
    expect(chips.find((chip) => chip.id === 'new')?.count).toBe(1);
    expect(chips.find((chip) => chip.id === 'active')?.count).toBe(2);
  });
});

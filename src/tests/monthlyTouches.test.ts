import { describe, expect, it } from 'vitest';
import {
  buildTouchCreateFields,
  buildTouchCreatePath,
  countTouchesByKind,
  filterTouches,
  formatTouchDateInput,
  resolveDefaultTouchTypeId,
  resolveTouchKind,
  resolveTouchesPeriod,
} from '../features/crm/functions/monthlyTouches';
import type { MonthlyTouchItem } from '../features/crm/mock/monthlyReportData';

const touches: MonthlyTouchItem[] = [
  {
    id: '1',
    title: 'Касание #1',
    typeId: '11912',
    typeLabel: 'Звонок',
    kind: 'calls',
    createdTime: '2026-08-21T10:00:00+03:00',
    month: 8,
    year: '2026',
    contactId: '32610',
  },
  {
    id: '2',
    title: 'Касание #2',
    typeId: '11914',
    typeLabel: 'Письмо',
    kind: 'emails',
    createdTime: '2026-07-21T10:00:00+03:00',
    month: 7,
    year: '2026',
    contactId: '32610',
  },
  {
    id: '3',
    title: 'Встреча с партнёром',
    typeId: '11916',
    typeLabel: 'Встреча',
    kind: 'meetings',
    createdTime: '2026-08-22T10:00:00+03:00',
    month: 8,
    year: '2026',
    contactId: '32610',
  },
];

describe('monthlyTouches', () => {
  it('resolves touch kinds from labels', () => {
    expect(resolveTouchKind('Звонок')).toBe('calls');
    expect(resolveTouchKind('Письмо')).toBe('emails');
    expect(resolveTouchKind('Встреча')).toBe('meetings');
  });

  it('defaults empty period to current month', () => {
    const period = resolveTouchesPeriod([], [], new Date('2026-08-27T12:00:00'));
    expect(period).toEqual({ months: [8], years: ['2026'] });
  });

  it('counts touches by kind and period', () => {
    expect(countTouchesByKind(touches, 'calls', [8], ['2026'])).toBe(1);
    expect(countTouchesByKind(touches, 'emails', [8], ['2026'])).toBe(0);
    expect(countTouchesByKind(touches, 'meetings', [8], ['2026'])).toBe(1);
  });

  it('filters touches by search', () => {
    const filtered = filterTouches(touches, { search: 'партнёр' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('3');
  });

  it('builds touch create path with contactId', () => {
    expect(buildTouchCreatePath('32610')).toBe(
      '/crm/type/1240/details/0/?contactId=32610',
    );
  });

  it('resolves default touch type from dialog kind', () => {
    const options = [
      { id: '11912', title: 'Звонок', kind: 'calls' as const },
      { id: '11914', title: 'Письмо', kind: 'emails' as const },
      { id: '11916', title: 'Встреча', kind: 'meetings' as const },
    ];
    expect(resolveDefaultTouchTypeId(options, 'emails')).toBe('11914');
    expect(resolveDefaultTouchTypeId(options, null)).toBe('11912');
  });

  it('builds create fields for touch SPA', () => {
    expect(buildTouchCreateFields({
      contactId: '32610',
      typeId: '11912',
      comment: 'Созвон по договору',
      date: '2026-09-10',
      partnerName: 'ООО Ромашка',
    })).toEqual({
      title: 'Созвон по договору',
      contactId: 32610,
      ufCrm132_1787151115483: 11912,
      ufCrm132_1786008277689: 'Созвон по договору',
      ufCrm132_1786008314575: '2026-09-10',
    });
  });

  it('formats date input as YYYY-MM-DD', () => {
    expect(formatTouchDateInput(new Date('2026-09-10T15:00:00'))).toBe('2026-09-10');
  });
});

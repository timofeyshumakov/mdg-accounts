import { describe, expect, it } from 'vitest';
import {
  countTouchesByKind,
  filterTouches,
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
});

import { describe, expect, it } from 'vitest';
import {
  buildMonthYearDateRanges,
  buildYearOptions,
  contactPassesFilters,
  createEmptyFilters,
  eventPassesFilters,
  matchesAssigned,
  matchesEventDate,
  matchesPartner,
  toCalendarDate,
} from '../features/crm/functions/crmFilters';

describe('crmFilters', () => {
  it('builds year options around current year', () => {
    const years = buildYearOptions(2026);
    expect(years[0]).toEqual({ id: '2027', title: '2027' });
    expect(years).toContainEqual({ id: '2026', title: '2026' });
    expect(years.at(-1)).toEqual({ id: '2016', title: '2016' });
  });

  it('builds month-year date ranges', () => {
    expect(buildMonthYearDateRanges([2], ['2026'])).toEqual([
      { from: '2026-02-01', to: '2026-02-28' },
    ]);

    expect(buildMonthYearDateRanges([], [])).toEqual([]);
  });

  it('parses calendar dates', () => {
    expect(toCalendarDate('2026-03-15T12:00:00')).toBe('2026-03-15');
    expect(toCalendarDate('15.03.2026')).toBe('2026-03-15');
    expect(toCalendarDate(null)).toBeNull();
  });

  it('matches assigned and partner values', () => {
    expect(matchesAssigned('10', [])).toBe(true);
    expect(matchesAssigned('10', ['10', '20'])).toBe(true);
    expect(matchesAssigned('11', ['10'])).toBe(false);

    expect(matchesPartner(42, ['42'])).toBe(true);
    expect(matchesPartner([41, 42], ['42'])).toBe(true);
    expect(matchesPartner(41, ['42'])).toBe(false);
  });

  it('matches event date by month and year', () => {
    expect(matchesEventDate('2026-08-10', [], [])).toBe(true);
    expect(matchesEventDate('2026-08-10', [8], ['2026'])).toBe(true);
    expect(matchesEventDate('2026-08-10', [7], ['2026'])).toBe(false);
    expect(matchesEventDate('2026-08-10', [8], ['2025'])).toBe(false);
    expect(matchesEventDate(null, [8], ['2026'])).toBe(false);
  });

  it('filters events by dashboard filters', () => {
    const event = {
      assignedById: 5,
      contactId: 100,
      ufCrm38_1745307580193: '2026-08-01',
    };

    expect(eventPassesFilters(event, createEmptyFilters())).toBe(true);
    expect(eventPassesFilters(event, {
      ...createEmptyFilters(),
      assignedIds: ['5'],
      partnerIds: ['100'],
      months: [8],
      years: ['2026'],
    })).toBe(true);
    expect(eventPassesFilters(event, {
      ...createEmptyFilters(),
      partnerIds: ['999'],
    })).toBe(false);
  });

  it('filters contacts and respects partners from events for date filters', () => {
    const contact = { ID: '100', ASSIGNED_BY_ID: '5' };

    expect(contactPassesFilters(contact, createEmptyFilters())).toBe(true);
    expect(contactPassesFilters(contact, {
      ...createEmptyFilters(),
      assignedIds: ['5'],
      partnerIds: ['100'],
    })).toBe(true);
    expect(contactPassesFilters(
      contact,
      { ...createEmptyFilters(), months: [8], years: ['2026'] },
      new Set(['100']),
    )).toBe(true);
    expect(contactPassesFilters(
      contact,
      { ...createEmptyFilters(), months: [8], years: ['2026'] },
      new Set(['200']),
    )).toBe(false);
  });
});

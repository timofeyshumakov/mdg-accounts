import { describe, expect, it } from 'vitest';
import {
  formatEventPeriod,
  formatUserName,
  parseMoney,
} from '../features/crm/functions/ourEventsList';

describe('ourEventsList', () => {
  it('formats user name without second name (patronymic)', () => {
    expect(formatUserName({
      LAST_NAME: 'Иванов',
      NAME: 'Иван',
      SECOND_NAME: 'Иванович',
    })).toBe('Иванов Иван');

    expect(formatUserName({
      LAST_NAME: 'Петров',
      NAME: 'Петр',
    })).toBe('Петров Петр');

    expect(formatUserName({
      SECOND_NAME: 'Сергеевич',
    })).toBe('Сергеевич');
  });

  it('formats a multi-day period with a dash', () => {
    expect(formatEventPeriod('2027-10-01', '2027-10-29')).toBe('01.10.2027 - 29.10.2027');
  });

  it('collapses a single-day period to one date', () => {
    expect(formatEventPeriod('2027-10-06', '2027-10-06')).toBe('06.10.2027');
  });

  it('falls back to whichever date exists', () => {
    expect(formatEventPeriod('2027-10-06', '')).toBe('06.10.2027');
    expect(formatEventPeriod('', '2027-10-06')).toBe('06.10.2027');
    expect(formatEventPeriod('', '')).toBe('');
  });

  it('parses bitrix money values', () => {
    expect(parseMoney('150000|RUB')).toBe(150000);
    expect(parseMoney('1 500 000|RUB')).toBe(1500000);
    expect(parseMoney(4200)).toBe(4200);
    expect(parseMoney(null)).toBe(0);
    expect(parseMoney('')).toBe(0);
  });
});

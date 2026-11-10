import { describe, expect, it } from 'vitest';
import {
  buildCompetitorEventDetailsPath,
  buildOurEventDetailsPath,
  CITIES_ENTITY_TYPE_ID,
  COMPETITOR_EVENT_CITY_FIELDS,
  COMPETITOR_EVENT_END_FIELDS,
  COMPETITOR_EVENT_NOSOLOGY_FIELDS,
  COMPETITOR_EVENT_START_FIELDS,
  COMPETITOR_EVENT_TYPE_FIELDS,
  eventOverlapsPeriod,
  formatEventDate,
  joinRefLabels,
  OUR_EVENT_END_FIELDS,
  OUR_EVENT_START_FIELDS,
  OUR_EVENT_TYPE_FIELDS,
  OUR_EVENT_CITY_FIELDS,
  OUR_EVENT_AUDIENCE_FIELDS,
  OUR_EVENT_CLIENT_FIELDS,
  OUR_EVENT_STAGE_FIELDS,
  OUR_EVENTS_STAGE_ENTITY_ID,
  OUR_EVENT_MANAGER_FIELDS,
} from '../features/crm/functions/monthlyEvents';
import { COMPETITOR_EVENTS_LIST_PATH } from '../features/crm/functions/monthlyReport';

const OCTOBER = { month: 10, year: '2026' };

describe('monthlyEvents', () => {
  it('formats bitrix datetime as ru date', () => {
    expect(formatEventDate('2026-10-13T03:00:00+03:00')).toBe('13.10.2026');
    expect(formatEventDate('2026-01-09')).toBe('09.01.2026');
    expect(formatEventDate('')).toBe('');
  });

  it('uses portal date fields for our and competitor events', () => {
    expect(OUR_EVENT_START_FIELDS[0]).toBe('ufCrm38_1745307580193');
    expect(OUR_EVENT_END_FIELDS[0]).toBe('ufCrm38_1751875905992');
    expect(COMPETITOR_EVENT_START_FIELDS[0]).toBe('ufCrm120_1782912304583');
    expect(COMPETITOR_EVENT_END_FIELDS[0]).toBe('ufCrm120_1782912316902');
  });

  it('uses portal fields for competitor type, nosology and city', () => {
    expect(COMPETITOR_EVENT_TYPE_FIELDS[0]).toBe('ufCrm120_1782912178006');
    expect(COMPETITOR_EVENT_NOSOLOGY_FIELDS[0]).toBe('ufCrm120_1782912441');
    expect(COMPETITOR_EVENT_CITY_FIELDS[0]).toBe('ufCrm120_1782912501');
  });

  it('uses the account-department manager as the our-events responsible', () => {
    expect(OUR_EVENT_MANAGER_FIELDS[0]).toBe('ufCrm38_1785338330');
    expect(OUR_EVENT_MANAGER_FIELDS[1]).toBe('UF_CRM_38_1785338330');
  });

  it('uses portal fields for our event type, city, audience, client and stage', () => {
    expect(OUR_EVENT_TYPE_FIELDS[0]).toBe('ufCrm38TipMeropriyatiya');
    expect(OUR_EVENT_TYPE_FIELDS[1]).toBe('UF_CRM_38_TIP_MEROPRIYATIYA');
    expect(OUR_EVENT_CITY_FIELDS[0]).toBe('ufCrm38_1753082280');
    expect(OUR_EVENT_AUDIENCE_FIELDS[0]).toBe('ufCrm38_1753365559');
    expect(OUR_EVENT_CLIENT_FIELDS[0]).toBe('contactId');
    expect(OUR_EVENT_STAGE_FIELDS[0]).toBe('stageId');
    expect(OUR_EVENTS_STAGE_ENTITY_ID).toBe('DYNAMIC_1052_STAGE_110');
  });

  it('points city field at the Cities smart process', () => {
    expect(CITIES_ENTITY_TYPE_ID).toBe(1094);
  });

  it('resolves reference ids into names instead of raw ids', () => {
    const typeLabels = new Map([['11816', 'Гибрид'], ['11818', 'Онлайн'], ['11820', 'Очка']]);
    const cityLabels = new Map([['2', 'Москва']]);
    const nosologyLabels = new Map([['31562', 'Педиатрия/Неонатология']]);

    expect(joinRefLabels(['11816'], typeLabels)).toBe('Гибрид');
    expect(joinRefLabels(['2'], cityLabels)).toBe('Москва');
    expect(joinRefLabels(['31562'], nosologyLabels)).toBe('Педиатрия/Неонатология');
    expect(joinRefLabels(['31562', '31563'], nosologyLabels)).toBe('Педиатрия/Неонатология');
  });

  it('returns empty string when no label was found', () => {
    expect(joinRefLabels(['999'], new Map())).toBe('');
    expect(joinRefLabels([], new Map([['1', 'X']]))).toBe('');
  });

  it('keeps events fully inside the month', () => {
    expect(eventOverlapsPeriod('2026-10-13', '2026-10-15', OCTOBER)).toBe(true);
  });

  it('keeps events overlapping the month from either side', () => {
    expect(eventOverlapsPeriod('2026-09-28', '2026-10-02', OCTOBER)).toBe(true);
    expect(eventOverlapsPeriod('2026-10-30', '2026-11-03', OCTOBER)).toBe(true);
    expect(eventOverlapsPeriod('2026-09-01', '2026-12-31', OCTOBER)).toBe(true);
  });

  it('drops events outside the month', () => {
    expect(eventOverlapsPeriod('2026-09-01', '2026-09-30', OCTOBER)).toBe(false);
    expect(eventOverlapsPeriod('2026-11-01', '2026-11-30', OCTOBER)).toBe(false);
    // Портал: запись 20 — март 2026, в октябре показываться не должна.
    expect(eventOverlapsPeriod('2026-03-24T03:00:00+03:00', '2026-03-26T03:00:00+03:00', OCTOBER))
      .toBe(false);
    // Портал: запись 18 — 15–16 октября, должна попасть.
    expect(eventOverlapsPeriod('2026-10-15T03:00:00+03:00', '2026-10-16T03:00:00+03:00', OCTOBER))
      .toBe(true);
  });

  it('uses start date as end date when end is empty', () => {
    expect(eventOverlapsPeriod('2026-10-05', '', OCTOBER)).toBe(true);
    expect(eventOverlapsPeriod('2026-09-05', '', OCTOBER)).toBe(false);
  });

  it('handles month boundaries and leap February', () => {
    expect(eventOverlapsPeriod('2026-10-31', '2026-10-31', OCTOBER)).toBe(true);
    expect(eventOverlapsPeriod('2026-10-01', '2026-10-01', OCTOBER)).toBe(true);
    expect(eventOverlapsPeriod('2028-02-29', '2028-02-29', { month: 2, year: '2028' })).toBe(true);
  });

  it('ignores events without any dates', () => {
    expect(eventOverlapsPeriod('', '', OCTOBER)).toBe(false);
  });

  it('builds details paths', () => {
    expect(buildOurEventDetailsPath('138')).toBe('/crm/type/1052/details/138/');
    expect(buildCompetitorEventDetailsPath('7')).toBe('/crm/type/1210/details/7/');
    expect(COMPETITOR_EVENTS_LIST_PATH).toBe('/crm/type/1210/list/category/0/');
  });
});

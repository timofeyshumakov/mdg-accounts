import { describe, expect, it } from 'vitest';
import {
  buildMonthlySummaryDetailsPath,
  buildMonthlySummaryListPath,
  buildMonthlyPlanDetailsPath,
  buildMonthlyPlanListPath,
  buildMonthlyPainsDetailsPath,
  buildMonthlyPainsListPath,
  buildPainTitle,
  buildPlanTitle,
  buildSummaryTitle,
  PLAN_FIELDS,
  MONTHLY_PAINS_CREATE_PATH,
  MONTHLY_PAINS_ENTITY_TYPE_ID,
  MONTHLY_PLAN_CREATE_PATH,
  MONTHLY_PLAN_ENTITY_TYPE_ID,
  MONTHLY_SUMMARY_CREATE_PATH,
  MONTHLY_SUMMARY_ENTITY_TYPE_ID,
  isCreatedInPeriod,
  PAIN_FIELDS,
} from '../features/crm/functions/monthlySummary';

describe('monthlySummary paths', () => {
  it('uses summary SPA 1278 and plan SPA 1262', () => {
    expect(MONTHLY_SUMMARY_ENTITY_TYPE_ID).toBe(1278);
    expect(MONTHLY_PLAN_ENTITY_TYPE_ID).toBe(1262);
  });

  it('builds summary details path', () => {
    expect(buildMonthlySummaryDetailsPath('77')).toBe('/crm/type/1278/details/77/');
  });

  it('builds plan list and details paths', () => {
    expect(buildMonthlyPlanListPath()).toBe('/crm/type/1262/list/category/0/');
    expect(buildMonthlyPlanDetailsPath('5')).toBe('/crm/type/1262/details/5/');
  });

  it('builds summary list path for period', () => {
    const path = buildMonthlySummaryListPath({ month: 10, year: '2026' });
    const query = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith('/crm/type/1278/list/category/0/')).toBe(true);
    expect(query.get('apply_filter')).toBe('Y');
    expect(query.get('>=CLOSEDATE')).toBe('2026-10-01');
  });

  it('builds summary list path filtered by contact', () => {
    const path = buildMonthlySummaryListPath(undefined, '42', 'Иванов И.И.');
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.get('CONTACT_ID')).toBe('42');
    expect(query.get('CONTACT_ID_label')).toBe('Иванов И.И.');
  });

  it('formats summary title with responsible and period', () => {
    expect(buildSummaryTitle('Иванова Анна', { month: 10, year: '2026' })).toBe(
      'Иванова Анна — 10.2026',
    );
    expect(buildSummaryTitle('', { month: 1, year: '2026' })).toBe('Резюме — 01.2026');
  });

  it('formats plan title with responsible and period', () => {
    expect(buildPlanTitle('Иванова Анна', { month: 10, year: '2026' })).toBe(
      'Иванова Анна — 10.2026',
    );
    expect(buildPlanTitle('', { month: 1, year: '2026' })).toBe('План по контактам — 01.2026');
  });

  it('uses pains SPA 1266 for paths', () => {
    expect(MONTHLY_PAINS_ENTITY_TYPE_ID).toBe(1266);
    expect(buildMonthlyPainsListPath()).toBe('/crm/type/1266/list/category/0/');
    expect(buildMonthlyPainsDetailsPath('9')).toBe('/crm/type/1266/details/9/');
  });

  it('uses portal field codes for pain columns', () => {
    expect(PAIN_FIELDS.problem).toBe('ufCrm144_1788253116451');
    expect(PAIN_FIELDS.impact).toBe('ufCrm144_1788253175552');
    expect(PAIN_FIELDS.suggestion).toBe('ufCrm144_1788253196290');
    expect(PAIN_FIELDS.problemUpper).toBe('UF_CRM_144_1788253116451');
    expect(PAIN_FIELDS.impactUpper).toBe('UF_CRM_144_1788253175552');
    expect(PAIN_FIELDS.suggestionUpper).toBe('UF_CRM_144_1788253196290');
  });

  it('formats pain title with responsible and period', () => {
    expect(buildPainTitle('Иванова Анна', { month: 10, year: '2026' })).toBe(
      'Иванова Анна — 10.2026',
    );
    expect(buildPainTitle('', { month: 1, year: '2026' })).toBe(
      'Боли и предложения — 01.2026',
    );
  });

  it('opens native bitrix create forms via details/0', () => {
    expect(MONTHLY_SUMMARY_CREATE_PATH).toBe('/crm/type/1278/details/0/');
    expect(MONTHLY_PLAN_CREATE_PATH).toBe('/crm/type/1262/details/0/');
    expect(MONTHLY_PAINS_CREATE_PATH).toBe('/crm/type/1266/details/0/');
  });

  it('uses portal field codes for plan columns', () => {
    expect(PLAN_FIELDS.month).toBe('ufCrm142_1788250973482');
    expect(PLAN_FIELDS.direction).toBe('ufCrm142_1788251039137');
    expect(PLAN_FIELDS.goal).toBe('ufCrm142_1788251088136');
    expect(PLAN_FIELDS.currentStatus).toBe('ufCrm142_1788251137871');
    expect(PLAN_FIELDS.nextStep).toBe('ufCrm142_1788251174043');
    expect(PLAN_FIELDS.priority).toBe('ufCrm142_1788251209245');
    expect(PLAN_FIELDS.monthUpper).toBe('UF_CRM_142_1788250973482');
    expect(PLAN_FIELDS.priorityUpper).toBe('UF_CRM_142_1788251209245');
  });

  it('filters summaries by creation month', () => {    const october = { month: 10, year: '2026' };

    expect(isCreatedInPeriod('2026-10-01', october)).toBe(true);
    expect(isCreatedInPeriod('2026-10-31', october)).toBe(true);
    expect(isCreatedInPeriod('2026-09-30', october)).toBe(false);
    expect(isCreatedInPeriod('2026-11-01', october)).toBe(false);
    expect(isCreatedInPeriod('2025-10-15', october)).toBe(false);
    expect(isCreatedInPeriod('', october)).toBe(false);
  });
});

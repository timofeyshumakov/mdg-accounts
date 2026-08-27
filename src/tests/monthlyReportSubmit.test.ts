import { describe, expect, it } from 'vitest';
import {
  MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
  MONTHLY_REPORT_SPA_FIELDS,
  buildMonthlyReportSpaDetailsPath,
  buildMonthlyReportSpaFields,
  resolveReportPeriod,
} from '../features/crm/functions/monthlyReportSubmit';
import type { MonthlyReportRow } from '../features/crm/mock/monthlyReportData';

const row: MonthlyReportRow = {
  id: '32610',
  partnerName: 'Игорь Баранов',
  organization: 'ООО Тест',
    nosologies: '',
    nosologyIds: [],
    relationStatus: 'Хороший',
  relationStatusId: '1',
  interest: '',
  agreementLink: '#',
  ourEventsLink: '#',
  competitorEventsLink: '#',
  calls: 1,
  emails: 1,
  meetings: 1,
  touches: [
    {
      id: '8',
      title: 'Касание #8',
      typeId: '11914',
      typeLabel: 'Письмо',
      kind: 'emails',
      createdTime: '2026-08-21T10:15:01+03:00',
      month: 8,
      year: '2026',
      contactId: '32610',
    },
    {
      id: '99',
      title: 'Старое',
      typeId: '11912',
      typeLabel: 'Звонок',
      kind: 'calls',
      createdTime: '2026-07-01T10:00:00+03:00',
      month: 7,
      year: '2026',
      contactId: '32610',
    },
  ],
  currentStatus: 'Готов участвовать',
  currentStatusId: '1',
  comment: 'Комментарий из таблицы',
  nextStep: 'Следующий шаг',
  tasks: 0,
  taskIds: [],
  taskItems: [],
  tasksLink: '#',
  companyId: '100',
  partnerTypeId: 'active',
  assignedId: '1614',
  month: 8,
  year: '2026',
};

describe('monthlyReportSubmit', () => {
  it('resolves current period from filters', () => {
    expect(resolveReportPeriod([8], ['2026'])).toEqual({ month: 8, year: '2026' });
    expect(resolveReportPeriod([], [], new Date('2026-03-15T12:00:00Z'))).toEqual({
      month: 3,
      year: '2026',
    });
    // несколько месяцев / годов → всё равно текущий (не смешиваем касания)
    expect(resolveReportPeriod([7, 8], ['2026'], new Date('2026-08-27T12:00:00'))).toEqual({
      month: 8,
      year: '2026',
    });
  });

  it('by default puts only current-month touches into spa fields', () => {
    const period = resolveReportPeriod([], [], new Date('2026-08-27T12:00:00'));
    const fields = buildMonthlyReportSpaFields(row, period);
    expect(fields[MONTHLY_REPORT_SPA_FIELDS.touches]).toEqual(['8']);
    expect(fields[MONTHLY_REPORT_SPA_FIELDS.touches]).not.toContain('99');
  });

  it('builds spa fields from table row for selected month', () => {
    const fields = buildMonthlyReportSpaFields(row, { month: 8, year: '2026' });

    expect(MONTHLY_REPORT_SPA_ENTITY_TYPE_ID).toBe(1258);
    expect(fields.title).toContain('Игорь Баранов');
    expect(fields.title).toContain('08.2026');
    expect(fields.contactId).toBe(32610);
    expect(fields.assignedById).toBe(1614);
    expect(fields.companyId).toBe(100);
    expect(fields[MONTHLY_REPORT_SPA_FIELDS.touches]).toEqual(['8']);
    expect(fields[MONTHLY_REPORT_SPA_FIELDS.comment]).toBe('Комментарий из таблицы');
    expect(fields[MONTHLY_REPORT_SPA_FIELDS.nextStep]).toBe('Следующий шаг');
    expect(fields[MONTHLY_REPORT_SPA_FIELDS.reportDate]).toBe('2026-08-01');
    expect(fields[MONTHLY_REPORT_SPA_FIELDS.currentStatus]).toBe('Готов участвовать');
    expect(buildMonthlyReportSpaDetailsPath(12)).toBe('/crm/type/1258/details/12/');
  });
});

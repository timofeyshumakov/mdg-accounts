/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENT_STATUS_FIELD,
  INTEREST_FIELD,
  RELATION_STATUS_FIELD,
  loadMonthlyReportData,
} from '../features/crm/functions/monthlyReport';
import { NOSOLOGY_CONTACT_FIELD } from '../features/crm/functions/nosologiesMetric';
import {
  getTestContactId,
  installBitrixWebhookMock,
} from './helpers/bitrixWebhook';

describe('monthlyReport table (webhook)', () => {
  let restoreBx24: (() => void) | undefined;

  beforeEach(() => {
    restoreBx24 = installBitrixWebhookMock();
  });

  afterEach(() => {
    restoreBx24?.();
  });

  it('loads one table row for test contact', async () => {
    const contactId = getTestContactId();
    expect(contactId).toBeTruthy();

    const data = await loadMonthlyReportData({ contactIds: [contactId] });

    expect(data.rows).toHaveLength(1);

    const row = data.rows[0];
    expect(row.id).toBe(contactId);
    expect(row.partnerName.length).toBeGreaterThan(0);
    expect(row.ourEventsLink).toContain('CONTACT_ID=');
    expect(row.ourEventsLink).toContain(contactId);
    expect(row.competitorEventsLink).toContain(`/crm/type/1210/`);
    expect(row.competitorEventsLink).toContain(contactId);

    expect(row.touches.length).toBeGreaterThan(0);
    expect(row.calls + row.emails + row.meetings).toBeGreaterThan(0);
    expect(row.touches.every((touch) => touch.contactId === contactId)).toBe(true);
    expect(row.tasksLink).toContain('/workgroups/group/1314/tasks/');
    expect(row.tasksLink).toContain(`C_${contactId}`);
    expect(row.tasks).toBeGreaterThan(0);
    expect(row.taskIds).toContain('300394');

    // Тип партнера = UF_CRM_1786959383413 (Новый / Действующий)
    expect(data.partnerTypeChips.find((chip) => chip.id === 'new')?.count).toBe(1);
    expect(data.partnerTypeChips.find((chip) => chip.id === 'active')?.count).toBe(0);

    // Поля таблицы из UF контакта (могут быть пустыми, но ключи должны быть).
    expect(row).toHaveProperty('relationStatus');
    expect(row).toHaveProperty('currentStatus');
    expect(row).toHaveProperty('interest');
    expect(row).toHaveProperty('nosologies');

    expect(RELATION_STATUS_FIELD).toBe('UF_CRM_1786959383413');
    expect(CURRENT_STATUS_FIELD).toBe('UF_CRM_1787148090748');
    expect(INTEREST_FIELD).toBe('UF_CRM_1787151854817');
    expect(NOSOLOGY_CONTACT_FIELD).toBe('UF_CRM_1782832034');
  }, 60_000);
});

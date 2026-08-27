/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadMonthlyReportData } from '../features/crm/functions/monthlyReport';
import {
  MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
  MONTHLY_REPORT_SPA_FIELDS,
  buildMonthlyReportSpaFields,
  createMonthlyReportSpaItem,
  resolveReportPeriod,
} from '../features/crm/functions/monthlyReportSubmit';
import {
  getTestContactId,
  installBitrixWebhookMock,
} from './helpers/bitrixWebhook';

describe('monthlyReport submit (webhook)', () => {
  let restoreBx24: (() => void) | undefined;

  beforeEach(() => {
    restoreBx24 = installBitrixWebhookMock();
  });

  afterEach(() => {
    restoreBx24?.();
  });

  it('creates spa 1258 item from table row for current month', async () => {
    const contactId = getTestContactId();
    const data = await loadMonthlyReportData({ contactIds: [contactId] });
    expect(data.rows).toHaveLength(1);

    const row = {
      ...data.rows[0],
      comment: 'Автотест комментарий',
      nextStep: 'Автотест следующий шаг',
    };
    const period = resolveReportPeriod([8], ['2026']);
    const fields = buildMonthlyReportSpaFields(row, period);

    expect(fields.contactId === Number(contactId) || fields.contactId === contactId).toBe(true);
    expect(Array.isArray(fields[MONTHLY_REPORT_SPA_FIELDS.touches])).toBe(true);

    const created = await createMonthlyReportSpaItem(row, period);
    expect(created.id).toBeTruthy();
    expect(Number(created.id)).toBeGreaterThan(0);
    expect(MONTHLY_REPORT_SPA_ENTITY_TYPE_ID).toBe(1258);
  }, 90_000);
});

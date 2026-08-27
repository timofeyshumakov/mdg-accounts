/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTasksByContactIds } from '../features/crm/functions/monthlyTasks';
import { loadMonthlyReportData } from '../features/crm/functions/monthlyReport';
import {
  getTestContactId,
  installBitrixWebhookMock,
} from './helpers/bitrixWebhook';

describe('tasks for test contact', () => {
  let restoreBx24: (() => void) | undefined;

  beforeEach(() => {
    restoreBx24 = installBitrixWebhookMock();
  });

  afterEach(() => {
    restoreBx24?.();
  });

  it('finds task 300394 for test contact', async () => {
    const contactId = getTestContactId();
    const byContact = await loadTasksByContactIds([contactId]);
    const tasks = byContact.get(contactId) ?? [];
    console.log('tasks', tasks);
    expect(tasks.map((t) => t.id)).toContain('300394');
    expect(tasks.length).toBeGreaterThan(0);

    const data = await loadMonthlyReportData({ contactIds: [contactId] });
    console.log('row.tasks', data.rows[0]?.tasks, data.rows[0]?.taskIds);
    expect(data.rows[0]?.tasks).toBeGreaterThan(0);
  }, 60_000);
});

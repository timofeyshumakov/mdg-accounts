import { describe, expect, it } from 'vitest';
import {
  TASKS_GROUP_LIST_PATH,
  buildContactCrmTaskValue,
  buildContactTasksListPath,
  extractContactIdsFromUfCrmTask,
  mapTaskToMonthlyItem,
} from '../features/crm/functions/monthlyTasks';

describe('monthlyTasks', () => {
  it('extracts contact ids from UF_CRM_TASK', () => {
    expect(extractContactIdsFromUfCrmTask(['C_32610', 'CO_1', 'D_5'])).toEqual(['32610']);
    expect(extractContactIdsFromUfCrmTask('C_10')).toEqual(['10']);
  });

  it('builds group tasks list path for contact', () => {
    const path = buildContactTasksListPath('32610', ['101', '102']);
    const query = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith(TASKS_GROUP_LIST_PATH)).toBe(true);
    expect(query.get('ta_sec')).toBe('view_all');
    expect(query.get('apply_filter')).toBe('Y');
    expect(query.get('UF_CRM_TASK')).toBe(buildContactCrmTaskValue('32610'));
    expect(query.get('ID[0]')).toBe('101');
    expect(query.get('ID[1]')).toBe('102');
  });

  it('maps task record to contact bindings', () => {
    const items = mapTaskToMonthlyItem({
      id: '55',
      title: 'Follow-up',
      ufCrmTask: ['C_32610', 'C_1'],
    });

    expect(items).toEqual([
      { id: '55', title: 'Follow-up', contactId: '32610' },
      { id: '55', title: 'Follow-up', contactId: '1' },
    ]);
  });

  it('maps nested task payload from tasks.task.list', () => {
    const items = mapTaskToMonthlyItem({
      task: {
        id: '300394',
        title: 'CRM: Тест Тестовый Задача 1',
        ufCrmTask: ['C_32610'],
      },
    });

    expect(items).toEqual([
      {
        id: '300394',
        title: 'CRM: Тест Тестовый Задача 1',
        contactId: '32610',
      },
    ]);
  });

  it('uses fallback contact ids when UF_CRM_TASK is missing', () => {
    const items = mapTaskToMonthlyItem(
      { id: '300394', title: 'CRM: Тест' },
      ['32610'],
    );

    expect(items).toEqual([
      { id: '300394', title: 'CRM: Тест', contactId: '32610' },
    ]);
  });
});

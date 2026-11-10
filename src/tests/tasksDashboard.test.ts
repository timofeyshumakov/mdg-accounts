import { describe, expect, it } from 'vitest';
import {
  parseTaskCrmBindings,
  resolveTaskStatusLabel,
  resolveTaskStatusTone,
  buildTaskCrmBindings,
  type TaskStageInfo,
} from '../features/crm/functions/tasksDashboard';
import { TASKS_PARTNERS_GROUP_ID, TASKS_GROUP_LIST_PATH } from '../features/crm/functions/tasksGroup';

/** Стадии, которые реально отдаёт task.stages.get(entityId = 1314). */
const STAGES = new Map<string, TaskStageInfo>([
  ['16684', { id: '16684', title: 'Новые / Распределение', color: '00c4fb' }],
  ['16686', { id: '16686', title: 'Принято в план работы', color: '47d1e2' }],
  ['16694', { id: '16694', title: 'Ожидание информации / Пауза в работе', color: 'dbdde0' }],
  ['16690', { id: '16690', title: 'Выполняются', color: '10e5fc' }],
  ['16982', { id: '16982', title: 'Приемка', color: 'ffab00' }],
  ['16688', { id: '16688', title: 'Сделаны', color: '00ff00' }],
]);

describe('task group constants', () => {
  it('keeps the partners group id in one place', () => {
    expect(TASKS_PARTNERS_GROUP_ID).toBe(1314);
    expect(TASKS_GROUP_LIST_PATH).toBe('/workgroups/group/1314/tasks/');
  });
});

describe('resolveTaskStatusLabel', () => {
  it('uses the real stage title from Bitrix', () => {
    expect(resolveTaskStatusLabel('16684', '2', STAGES)).toBe('Новые / Распределение');
    expect(resolveTaskStatusLabel('16690', '3', STAGES)).toBe('Выполняются');
    expect(resolveTaskStatusLabel('16688', '5', STAGES)).toBe('Сделаны');
    expect(resolveTaskStatusLabel('16694', '2', STAGES)).toBe('Ожидание информации / Пауза в работе');
    expect(resolveTaskStatusLabel('16982', '4', STAGES)).toBe('Приемка');
  });

  it('falls back to the standard status when the stage is unknown', () => {
    expect(resolveTaskStatusLabel('99999', '3', STAGES)).toBe('В работе');
    expect(resolveTaskStatusLabel('', '5', STAGES)).toBe('Готово');
    expect(resolveTaskStatusLabel('99999', '42', STAGES)).toBe('Статус 42');
    expect(resolveTaskStatusLabel('99999', '', STAGES)).toBe('');
  });
});

describe('resolveTaskStatusTone', () => {
  it('derives the tone from the stage color', () => {
    // Зелёный — готово.
    expect(resolveTaskStatusTone('16688', '5', STAGES)).toBe('done');
    // Серый — пауза.
    expect(resolveTaskStatusTone('16694', '2', STAGES)).toBe('muted');
    // Голубые стадии — в работе.
    expect(resolveTaskStatusTone('16684', '2', STAGES)).toBe('progress');
    expect(resolveTaskStatusTone('16690', '3', STAGES)).toBe('progress');
  });

  it('falls back to the standard status when the stage is unknown', () => {
    expect(resolveTaskStatusTone('99999', '5', STAGES)).toBe('done');
    expect(resolveTaskStatusTone('99999', '3', STAGES)).toBe('progress');
    expect(resolveTaskStatusTone('99999', '', STAGES)).toBe('muted');
  });
});

describe('task CRM bindings', () => {
  it('builds contact and event bindings', () => {
    expect(buildTaskCrmBindings('32190', '470')).toEqual(['C_32190', 'T41c_470']);
  });

  it('omits the event binding when there is no event', () => {
    expect(buildTaskCrmBindings('32190')).toEqual(['C_32190']);
  });

  it('parses bindings from UF_CRM_TASK', () => {
    expect(parseTaskCrmBindings(['C_32190', 'T41c_470'])).toEqual({
      contactIds: ['32190'],
      eventIds: ['470'],
    });
  });

  it('ignores bindings of other smart processes', () => {
    // В задаче 306738 на портале есть оба: T38c_344 и T41c_344.
    expect(parseTaskCrmBindings(['C_32190', 'T38c_344', 'T41c_344'])).toEqual({
      contactIds: ['32190'],
      eventIds: ['344'],
    });
    expect(parseTaskCrmBindings(['T38c_344'])).toEqual({
      contactIds: [],
      eventIds: [],
    });
  });
});

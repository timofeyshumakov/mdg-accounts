import { callBxMethod, extractPageItems } from './bitrixApi';
import { getBx24 } from './bitrixClient';
import { extractScalarValues } from './bitrixFields';
import { NAV_EXTERNAL_PATHS } from './crmNavigation';
import type { Bx24CallResult } from '../../../env.d';

export const TASKS_GROUP_ID = 1314;

export const TASKS_GROUP_LIST_PATH = NAV_EXTERNAL_PATHS.tasks;

const TASKS_PAGE_SIZE = 50;

export interface MonthlyTaskItem {
  id: string;
  title: string;
  contactId: string;
}

function firstScalar(value: unknown): string {
  const values = extractScalarValues(value);
  return values[0] ? String(values[0]) : '';
}

/** UF_CRM_TASK хранит привязки вида C_123, CO_1, D_5… */
export function extractContactIdsFromUfCrmTask(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  const ids: string[] = [];

  values.forEach((entry) => {
    const match = String(entry).trim().match(/^C_(\d+)$/i);
    if (match) {
      ids.push(match[1]);
    }
  });

  return [...new Set(ids)];
}

export function buildContactCrmTaskValue(contactId: string): string {
  return `C_${contactId}`;
}

export function buildTaskDetailsPath(taskId: string | number): string {
  return `/workgroups/group/${TASKS_GROUP_ID}/tasks/task/view/${taskId}/`;
}

export function buildContactTasksListPath(
  contactId: string,
  taskIds: string[] = [],
): string {
  const params = new URLSearchParams();
  // Без пресета «Мои задачи» — иначе список часто пустой
  params.set('ta_sec', 'view_all');
  params.set('apply_filter', 'Y');
  params.set('UF_CRM_TASK', buildContactCrmTaskValue(contactId));
  params.set('UF_CRM_TASK_label', buildContactCrmTaskValue(contactId));

  if (taskIds.length === 1) {
    params.set('ID', taskIds[0]);
  } else if (taskIds.length > 1) {
    taskIds.forEach((taskId, index) => {
      params.set(`ID[${index}]`, taskId);
    });
  }

  return `${TASKS_GROUP_LIST_PATH}?${params.toString()}`;
}

function normalizeTaskRecord(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.task && typeof raw.task === 'object') {
    return raw.task as Record<string, unknown>;
  }
  return raw;
}

function readTaskUfCrm(task: Record<string, unknown>): unknown {
  return task.ufCrmTask ?? task.UF_CRM_TASK ?? task.uf_crm_task;
}

export function mapTaskToMonthlyItem(
  raw: Record<string, unknown>,
  fallbackContactIds: string[] = [],
): MonthlyTaskItem[] {
  const task = normalizeTaskRecord(raw);
  const id = firstScalar(task.id ?? task.ID);
  if (!id) {
    return [];
  }

  const title = String(task.title ?? task.TITLE ?? `Задача #${id}`);
  let contactIds = extractContactIdsFromUfCrmTask(readTaskUfCrm(task));

  if (!contactIds.length && fallbackContactIds.length) {
    contactIds = [...fallbackContactIds];
  }

  return contactIds.map((contactId) => ({
    id,
    title,
    contactId,
  }));
}

function parseTaskGetPayload(
  raw: unknown,
  fallbackId: string,
): { id: string; title: string; contactIds: string[] } | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const task = normalizeTaskRecord(raw as Record<string, unknown>);
  const id = firstScalar(task.id ?? task.ID) || fallbackId;
  if (!id) {
    return null;
  }

  return {
    id,
    title: String(task.title ?? task.TITLE ?? `Задача #${id}`),
    contactIds: extractContactIdsFromUfCrmTask(readTaskUfCrm(task)),
  };
}

/** Пагинация через start — BX24.more()/next() для tasks.task.list ненадёжны. */
async function fetchAllTasks(
  filter: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let start = 0;

  for (;;) {
    const data = await callBxMethod<unknown>('tasks.task.list', {
      filter,
      select: ['ID', 'TITLE', 'GROUP_ID', 'UF_CRM_TASK'],
      start,
    });
    const page = extractPageItems<Record<string, unknown>>(data);
    items.push(...page);

    if (page.length < TASKS_PAGE_SIZE) {
      break;
    }

    start += TASKS_PAGE_SIZE;
    if (start > 5000) {
      break;
    }
  }

  return items;
}

async function fetchTaskUfByIds(
  taskIds: string[],
): Promise<Map<string, { title: string; contactIds: string[] }>> {
  const result = new Map<string, { title: string; contactIds: string[] }>();
  const uniqueIds = [...new Set(taskIds.map(String).filter(Boolean))];
  if (!uniqueIds.length) {
    return result;
  }

  const bx24 = getBx24();

  if (typeof bx24?.callBatch === 'function') {
    const chunkSize = 50;
    for (let index = 0; index < uniqueIds.length; index += chunkSize) {
      const chunk = uniqueIds.slice(index, index + chunkSize);
      const commands: Record<string, { method: string; params: Record<string, unknown> }> = {};
      chunk.forEach((taskId, cmdIndex) => {
        commands[`t${cmdIndex}`] = {
          method: 'tasks.task.get',
          params: {
            taskId,
            select: ['ID', 'TITLE', 'UF_CRM_TASK'],
          },
        };
      });

      const batchResults = await new Promise<Record<string, Bx24CallResult>>((resolve, reject) => {
        bx24.callBatch?.(commands, (res) => {
          if (!res) {
            reject(new Error('Пустой ответ callBatch'));
            return;
          }
          resolve(res as Record<string, Bx24CallResult>);
        });
      });

      chunk.forEach((taskId, cmdIndex) => {
        const entry = batchResults[`t${cmdIndex}`];
        if (!entry || entry.error()) {
          return;
        }
        const parsed = parseTaskGetPayload(entry.data(), taskId);
        if (parsed) {
          result.set(parsed.id, {
            title: parsed.title,
            contactIds: parsed.contactIds,
          });
        }
      });
    }

    return result;
  }

  for (const taskId of uniqueIds) {
    try {
      const raw = await callBxMethod('tasks.task.get', {
        taskId,
        select: ['ID', 'TITLE', 'UF_CRM_TASK'],
      });
      const parsed = parseTaskGetPayload(raw, taskId);
      if (parsed) {
        result.set(parsed.id, {
          title: parsed.title,
          contactIds: parsed.contactIds,
        });
      }
    } catch (error) {
      console.warn(`Не удалось получить UF_CRM_TASK задачи #${taskId}:`, error);
    }
  }

  return result;
}

export async function loadTasksByContactIds(
  contactIds: string[],
): Promise<Map<string, MonthlyTaskItem[]>> {
  const result = new Map<string, MonthlyTaskItem[]>();
  const uniqueIds = [...new Set(contactIds.map(String).filter(Boolean))];
  if (!uniqueIds.length) {
    return result;
  }

  const contactSet = new Set(uniqueIds);

  const appendItem = (item: MonthlyTaskItem) => {
    if (!contactSet.has(item.contactId)) {
      return;
    }
    const list = result.get(item.contactId) ?? [];
    if (!list.some((existing) => existing.id === item.id)) {
      list.push(item);
    }
    result.set(item.contactId, list);
  };

  const ingestList = (
    tasks: Record<string, unknown>[],
    fallbackContactIds: string[] = [],
  ): string[] => {
    const unresolvedIds: string[] = [];

    tasks.forEach((raw) => {
      const mapped = mapTaskToMonthlyItem(raw, fallbackContactIds);
      if (mapped.length) {
        mapped.forEach(appendItem);
        return;
      }

      const task = normalizeTaskRecord(raw);
      const id = firstScalar(task.id ?? task.ID);
      if (id) {
        unresolvedIds.push(id);
      }
    });

    return unresolvedIds;
  };

  try {
    let groupTasks: Record<string, unknown>[] = [];
    try {
      groupTasks = await fetchAllTasks({ GROUP_ID: TASKS_GROUP_ID });
    } catch (groupError) {
      console.warn('Не удалось загрузить задачи группы, пробуем без GROUP_ID:', groupError);
    }

    let unresolvedIds = ingestList(groupTasks);

    if (unresolvedIds.length) {
      const details = await fetchTaskUfByIds(unresolvedIds);
      details.forEach((detail, taskId) => {
        detail.contactIds.forEach((contactId) => {
          appendItem({
            id: taskId,
            title: detail.title,
            contactId,
          });
        });
      });
    }

    const missingContacts = uniqueIds.filter((id) => !(result.get(id)?.length));
    const chunkSize = 20;

    for (let index = 0; index < missingContacts.length; index += chunkSize) {
      const chunk = missingContacts.slice(index, index + chunkSize);
      const crmValues = chunk.map(buildContactCrmTaskValue);

      try {
        let tasks: Record<string, unknown>[] = [];
        try {
          tasks = await fetchAllTasks({
            GROUP_ID: TASKS_GROUP_ID,
            UF_CRM_TASK: chunk.length === 1 ? crmValues[0] : crmValues,
          });
        } catch {
          tasks = await fetchAllTasks({
            UF_CRM_TASK: chunk.length === 1 ? crmValues[0] : crmValues,
          });
        }

        unresolvedIds = ingestList(tasks, chunk.length === 1 ? chunk : []);

        if (unresolvedIds.length && chunk.length > 1) {
          const details = await fetchTaskUfByIds(unresolvedIds);
          details.forEach((detail, taskId) => {
            detail.contactIds.forEach((contactId) => {
              appendItem({
                id: taskId,
                title: detail.title,
                contactId,
              });
            });
          });
        }
      } catch (error) {
        console.warn('Не удалось догрузить задачи по UF_CRM_TASK:', error);
      }
    }
  } catch (error) {
    console.warn('Не удалось загрузить задачи контактов:', error);
  }

  return result;
}

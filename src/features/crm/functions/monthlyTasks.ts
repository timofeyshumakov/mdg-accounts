import {
  callBxBatch,
  callBxMethod,
  extractPageItems,
  readBatchResultData,
  type Bx24BatchCommands,
} from './bitrixApi';
import { getBx24 } from './bitrixClient';
import { extractScalarValues } from './bitrixFields';
import { NAV_EXTERNAL_PATHS } from './crmNavigation';

export const TASKS_GROUP_ID = 1314;

export const TASKS_GROUP_LIST_PATH = NAV_EXTERNAL_PATHS.tasks;

const TASKS_PAGE_SIZE = 50;
/** Сколько страниц tasks.task.list за один callBatch. */
const TASKS_LIST_PAGES_PER_BATCH = 10;
/** Сколько list-запросов по контактам в одном callBatch. */
const TASKS_LIST_CONTACTS_PER_BATCH = 50;
const TASKS_GET_PER_BATCH = 50;
const TASK_LIST_SELECT = ['ID', 'TITLE', 'GROUP_ID', 'UF_CRM_TASK'] as const;

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

function buildTaskListParams(
  filter: Record<string, unknown>,
  start = 0,
): Record<string, unknown> {
  return {
    filter,
    select: [...TASK_LIST_SELECT],
    start,
  };
}

function canUseBatch(): boolean {
  return typeof getBx24()?.callBatch === 'function';
}

/** Одна страница tasks.task.list (fallback без batch). */
async function fetchTasksPage(
  filter: Record<string, unknown>,
  start = 0,
): Promise<Record<string, unknown>[]> {
  const data = await callBxMethod<unknown>(
    'tasks.task.list',
    buildTaskListParams(filter, start),
  );
  return extractPageItems<Record<string, unknown>>(data);
}

/**
 * Все страницы tasks.task.list.
 * При доступном callBatch — несколько start в одном batch.
 */
async function fetchAllTasks(
  filter: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];

  if (!canUseBatch()) {
    let start = 0;
    for (;;) {
      const page = await fetchTasksPage(filter, start);
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

  let start = 0;
  while (start <= 5000) {
    const pageStarts: number[] = [];
    for (
      let index = 0;
      index < TASKS_LIST_PAGES_PER_BATCH && start + index * TASKS_PAGE_SIZE <= 5000;
      index += 1
    ) {
      pageStarts.push(start + index * TASKS_PAGE_SIZE);
    }

    const commands: Bx24BatchCommands = {};
    pageStarts.forEach((pageStart, index) => {
      commands[`p${index}`] = {
        method: 'tasks.task.list',
        params: buildTaskListParams(filter, pageStart),
      };
    });

    const batchResults = await callBxBatch(commands);
    let reachedEnd = false;

    for (let index = 0; index < pageStarts.length; index += 1) {
      const data = readBatchResultData(batchResults[`p${index}`]);
      if (data == null) {
        if (index === 0 && start === 0) {
          throw new Error('Не удалось загрузить список задач');
        }
        reachedEnd = true;
        break;
      }

      const page = extractPageItems<Record<string, unknown>>(data);
      items.push(...page);

      if (page.length < TASKS_PAGE_SIZE) {
        reachedEnd = true;
        break;
      }
    }

    if (reachedEnd) {
      break;
    }

    start += pageStarts.length * TASKS_PAGE_SIZE;
  }

  return items;
}

/** Пакетный tasks.task.list по одному UF_CRM_TASK на контакт. */
async function fetchTasksListByContactsBatch(
  contactIds: string[],
  withGroupId: boolean,
): Promise<Map<string, Record<string, unknown>[]>> {
  const result = new Map<string, Record<string, unknown>[]>();
  if (!contactIds.length) {
    return result;
  }

  if (!canUseBatch()) {
    for (const contactId of contactIds) {
      const filter: Record<string, unknown> = {
        UF_CRM_TASK: buildContactCrmTaskValue(contactId),
      };
      if (withGroupId) {
        filter.GROUP_ID = TASKS_GROUP_ID;
      }
      result.set(contactId, await fetchAllTasks(filter));
    }
    return result;
  }

  for (let index = 0; index < contactIds.length; index += TASKS_LIST_CONTACTS_PER_BATCH) {
    const chunk = contactIds.slice(index, index + TASKS_LIST_CONTACTS_PER_BATCH);
    const commands: Bx24BatchCommands = {};

    chunk.forEach((contactId, cmdIndex) => {
      const filter: Record<string, unknown> = {
        UF_CRM_TASK: buildContactCrmTaskValue(contactId),
      };
      if (withGroupId) {
        filter.GROUP_ID = TASKS_GROUP_ID;
      }
      commands[`c${cmdIndex}`] = {
        method: 'tasks.task.list',
        params: buildTaskListParams(filter, 0),
      };
    });

    const batchResults = await callBxBatch(commands);
    const needMorePages: string[] = [];

    chunk.forEach((contactId, cmdIndex) => {
      const data = readBatchResultData(batchResults[`c${cmdIndex}`]);
      if (data == null) {
        result.set(contactId, []);
        return;
      }

      const page = extractPageItems<Record<string, unknown>>(data);
      result.set(contactId, page);

      if (page.length >= TASKS_PAGE_SIZE) {
        needMorePages.push(contactId);
      }
    });

    // Редкие контакты с >50 задачами — добираем остальные страницы batch-пагинацией.
    for (const contactId of needMorePages) {
      const filter: Record<string, unknown> = {
        UF_CRM_TASK: buildContactCrmTaskValue(contactId),
      };
      if (withGroupId) {
        filter.GROUP_ID = TASKS_GROUP_ID;
      }
      const all = await fetchAllTasks(filter);
      result.set(contactId, all);
    }
  }

  return result;
}

async function fetchTaskUfByIds(
  taskIds: string[],
): Promise<Map<string, { title: string; contactIds: string[] }>> {
  const result = new Map<string, { title: string; contactIds: string[] }>();
  const uniqueIds = [...new Set(taskIds.map(String).filter(Boolean))];
  if (!uniqueIds.length) {
    return result;
  }

  if (canUseBatch()) {
    for (let index = 0; index < uniqueIds.length; index += TASKS_GET_PER_BATCH) {
      const chunk = uniqueIds.slice(index, index + TASKS_GET_PER_BATCH);
      const commands: Bx24BatchCommands = {};
      chunk.forEach((taskId, cmdIndex) => {
        commands[`t${cmdIndex}`] = {
          method: 'tasks.task.get',
          params: {
            taskId,
            select: ['ID', 'TITLE', 'UF_CRM_TASK'],
          },
        };
      });

      const batchResults = await callBxBatch(commands);
      chunk.forEach((taskId, cmdIndex) => {
        const data = readBatchResultData(batchResults[`t${cmdIndex}`]);
        if (data == null) {
          return;
        }
        const parsed = parseTaskGetPayload(data, taskId);
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
    if (!missingContacts.length) {
      return result;
    }

    let byContact: Map<string, Record<string, unknown>[]>;
    try {
      byContact = await fetchTasksListByContactsBatch(missingContacts, true);
    } catch (groupFilterError) {
      console.warn('Batch list с GROUP_ID не удался, пробуем без группы:', groupFilterError);
      byContact = await fetchTasksListByContactsBatch(missingContacts, false);
    }

    const stillUnresolved: string[] = [];

    byContact.forEach((tasks, contactId) => {
      const unresolved = ingestList(tasks, [contactId]);
      stillUnresolved.push(...unresolved);
    });

    if (stillUnresolved.length) {
      const details = await fetchTaskUfByIds(stillUnresolved);
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
    console.warn('Не удалось загрузить задачи контактов:', error);
  }

  return result;
}

import type { Bx24CallResult } from '../../../env.d';
import { getBx24, hasBx24CallMethod } from './bitrixClient';

export function extractPageItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    const record = data as {
      items?: unknown;
      tasks?: unknown;
    };

    if (Array.isArray(record.items)) {
      return record.items as T[];
    }

    if (Array.isArray(record.tasks)) {
      return record.tasks as T[];
    }

    // BX24 иногда отдаёт tasks как объект { "0": {...}, "1": {...} }
    if (record.tasks && typeof record.tasks === 'object') {
      return Object.values(record.tasks as Record<string, T>);
    }
  }

  return [];
}

export function callBxMethod<T>(
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const bx24 = getBx24();
    if (!bx24?.callMethod) {
      reject(new Error('BX24 API недоступен'));
      return;
    }

    bx24.callMethod(method, params, (result: Bx24CallResult) => {
      if (result.error()) {
        reject(result.error());
        return;
      }

      resolve(result.data() as T);
    });
  });
}

export type Bx24BatchCommands = Record<
  string,
  { method: string; params?: Record<string, unknown> }
>;

/** BX24.callBatch — до 50 команд за раз. */
export function callBxBatch(
  commands: Bx24BatchCommands,
): Promise<Record<string, Bx24CallResult>> {
  return new Promise((resolve, reject) => {
    const bx24 = getBx24();
    if (!bx24?.callBatch) {
      reject(new Error('BX24.callBatch недоступен'));
      return;
    }

    if (!Object.keys(commands).length) {
      resolve({});
      return;
    }

    bx24.callBatch(commands, (results) => {
      if (!results) {
        reject(new Error('Пустой ответ callBatch'));
        return;
      }
      resolve(results);
    });
  });
}

export function readBatchResultData(entry: Bx24CallResult | undefined): unknown {
  if (!entry || entry.error()) {
    return null;
  }
  return entry.data();
}

const LIST_PAGE_SIZE = 50;
/** Сколько страниц list-метода в одном callBatch (лимит batch — 50). */
const LIST_PAGES_PER_BATCH = 10;
const LIST_MAX_START = 50_000;

function canUseBatch(): boolean {
  return typeof getBx24()?.callBatch === 'function';
}

async function fetchAllPagesSequential<T>(
  method: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const bx24 = getBx24();
    if (!bx24?.callMethod) {
      reject(new Error('BX24 API недоступен'));
      return;
    }

    const items: T[] = [];

    const handleResult = (result: Bx24CallResult) => {
      if (result.error()) {
        reject(result.error());
        return;
      }

      items.push(...extractPageItems<T>(result.data()));

      if (result.more?.()) {
        result.next?.();
        return;
      }

      resolve(items);
    };

    bx24.callMethod(method, params, handleResult);
  });
}

/** Пагинация list через callBatch: несколько start за один запрос. */
async function fetchAllPagesBatch<T>(
  method: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  const items: T[] = [];
  let start = 0;

  while (start <= LIST_MAX_START) {
    const pageStarts: number[] = [];
    for (
      let index = 0;
      index < LIST_PAGES_PER_BATCH && start + index * LIST_PAGE_SIZE <= LIST_MAX_START;
      index += 1
    ) {
      pageStarts.push(start + index * LIST_PAGE_SIZE);
    }

    const commands: Bx24BatchCommands = {};
    pageStarts.forEach((pageStart, index) => {
      commands[`p${index}`] = {
        method,
        params: {
          ...params,
          start: pageStart,
        },
      };
    });

    const batchResults = await callBxBatch(commands);
    let reachedEnd = false;

    for (let index = 0; index < pageStarts.length; index += 1) {
      const entry = batchResults[`p${index}`];
      if (!entry || entry.error()) {
        if (index === 0 && start === 0) {
          throw entry?.error() || new Error(`Не удалось загрузить ${method}`);
        }
        reachedEnd = true;
        break;
      }

      const page = extractPageItems<T>(entry.data());
      items.push(...page);

      const total = Number(entry.total?.() ?? 0);
      if (page.length < LIST_PAGE_SIZE || (total > 0 && items.length >= total)) {
        reachedEnd = true;
        break;
      }
    }

    if (reachedEnd) {
      break;
    }

    start += pageStarts.length * LIST_PAGE_SIZE;
  }

  return items;
}

export async function fetchAllPages<T>(
  method: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  if (!hasBx24CallMethod()) {
    throw new Error('BX24 API недоступен');
  }

  if (canUseBatch()) {
    return fetchAllPagesBatch<T>(method, params);
  }

  return fetchAllPagesSequential<T>(method, params);
}

/** crm.contact.list со всеми страницами через callBatch. */
export async function fetchAllContactList<T = Record<string, unknown>>(
  params: Record<string, unknown> = {},
): Promise<T[]> {
  return fetchAllPages<T>('crm.contact.list', params);
}

export function countCrmItems(
  entityTypeId: number,
  filter: Record<string, unknown> = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    const bx24 = getBx24();
    if (!bx24?.callMethod) {
      reject(new Error('BX24 API недоступен'));
      return;
    }

    bx24.callMethod(
      'crm.item.list',
      {
        entityTypeId,
        filter,
        select: ['id'],
      },
      (result: Bx24CallResult) => {
        if (result.error()) {
          reject(result.error());
          return;
        }

        const data = result.data();
        const total = result.total?.() ?? extractPageItems(data).length;

        resolve(Number(total) || 0);
      },
    );
  });
}

export async function fetchAllCrmItems(
  entityTypeId: number,
  select?: string[] | null,
  filter: Record<string, unknown> = {},
  extraParams: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> {
  const params: Record<string, unknown> = {
    entityTypeId,
    filter,
    ...extraParams,
  };

  if (select != null) {
    params.select = select;
  }

  return fetchAllPages<Record<string, unknown>>('crm.item.list', params);
}

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

export async function fetchAllPages<T>(
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

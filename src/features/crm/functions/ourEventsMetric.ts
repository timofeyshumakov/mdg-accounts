import { callBxMethod, countCrmItems } from './bitrixApi';
import {
  extractCrmTypes,
  type CrmType,
} from './competitorEventsMetric';

/** Смарт-процесс «Мероприятия» на портале ittochka (crm.type.list → id: 38). */
export const OUR_EVENTS_SMART_PROCESS_ID = 38;

/** entityTypeId для REST-запросов crm.item.* к «Мероприятиям». */
export const OUR_EVENTS_ENTITY_TYPE_ID = 1052;

export const OUR_EVENTS_TYPE_TITLE = 'мероприятия';

let cachedEntityTypeId: number | null = null;

export function findOurEventsEntityTypeId(
  types: CrmType[],
): number | null {
  const byTitle = types.find(
    (type) => (type.title ?? '').trim().toLowerCase() === OUR_EVENTS_TYPE_TITLE,
  );
  if (byTitle?.entityTypeId) {
    return byTitle.entityTypeId;
  }

  const byKnownId = types.find(
    (type) => type.entityTypeId === OUR_EVENTS_ENTITY_TYPE_ID,
  );
  return byKnownId?.entityTypeId ?? null;
}

export async function getOurEventsEntityTypeId(): Promise<number> {
  if (cachedEntityTypeId != null) {
    return cachedEntityTypeId;
  }

  try {
    const raw = await callBxMethod<{ types?: CrmType[] } | CrmType[]>(
      'crm.type.list',
      { order: { id: 'ASC' } },
    );
    const entityTypeId = findOurEventsEntityTypeId(extractCrmTypes(raw));

    if (entityTypeId) {
      cachedEntityTypeId = entityTypeId;
      return entityTypeId;
    }
  } catch (error) {
    console.warn(
      'Не удалось определить смарт-процесс «Мероприятия», используем entityTypeId 1052:',
      error,
    );
  }

  cachedEntityTypeId = OUR_EVENTS_ENTITY_TYPE_ID;
  return cachedEntityTypeId;
}

export async function getOurEventsCount(): Promise<number> {
  const entityTypeId = await getOurEventsEntityTypeId();
  return countCrmItems(entityTypeId);
}

/** Сброс кэша — только для тестов. */
export function resetOurEventsEntityTypeCacheForTests(): void {
  cachedEntityTypeId = null;
}

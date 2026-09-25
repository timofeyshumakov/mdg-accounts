import { callBxMethod, countCrmItems, fetchAllCrmItems } from './bitrixApi';
import {
  extractCrmTypes,
  type CrmType,
} from './competitorEventsMetric';
import { toCalendarDate, matchesEventDate } from './crmFilters';

/** Партнёр мероприятия — стандартное поле «Контакт». */
const EVENT_PARTNER_FIELD = 'contactId';
const EVENT_PARTNER_FIELD_UPPER = 'CONTACT_ID';

/** Дата начала мероприятия. */
const EVENT_START_DATE_FIELD = 'ufCrm38_1745307580193';
const EVENT_START_DATE_FIELD_UPPER = 'UF_CRM_38_1745307580193';

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

/** Интерфейс мероприятия. */
export interface OurEventItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  contactId: string;
}

/** Загрузка мероприятий для списка контактов с фильтрацией по месяцам/годам. */
export async function loadEventsForContacts(
  contactIds: string[],
  months: number[] = [],
  years: string[] = [],
): Promise<Map<string, OurEventItem[]>> {
  const eventsMap = new Map<string, OurEventItem[]>();

  if (!contactIds.length) {
    return eventsMap;
  }

  const entityTypeId = await getOurEventsEntityTypeId();
  const select = [
    'id',
    'title',
    EVENT_PARTNER_FIELD,
    EVENT_PARTNER_FIELD_UPPER,
    EVENT_START_DATE_FIELD,
    EVENT_START_DATE_FIELD_UPPER,
    'ufCrm38_1750949375117',
    'UF_CRM_38_1750949375117',
    'begindate',
  ];

  try {
    const items = await fetchAllCrmItems(
      entityTypeId,
      select,
      {},
    );

    items.forEach((item) => {
      const contactId = extractContactIdFromEvent(item);
      if (!contactId || !contactIds.includes(contactId)) {
        return;
      }

      const startDateValue = item[EVENT_START_DATE_FIELD]
        ?? item[EVENT_START_DATE_FIELD_UPPER]
        ?? item.begindate;

      if (!matchesEventDate(startDateValue, months, years.map(String))) {
        return;
      }

      const startDate = toCalendarDate(startDateValue);
      const endDate = toCalendarDate(
        item.ufCrm38_1750949375117
        ?? item.UF_CRM_38_1750949375117,
      );

      const eventItem: OurEventItem = {
        id: String(item.id ?? ''),
        title: String(item.title ?? 'Без названия'),
        startDate: startDate || '',
        endDate: endDate || '',
        contactId,
      };

      const existing = eventsMap.get(contactId) ?? [];
      existing.push(eventItem);
      eventsMap.set(contactId, existing);
    });
  } catch (error) {
    console.warn('Не удалось загрузить мероприятия:', error);
  }

  return eventsMap;
}

function extractContactIdFromEvent(item: Record<string, unknown>): string {
  const raw = item[EVENT_PARTNER_FIELD] ?? item[EVENT_PARTNER_FIELD_UPPER];
  if (Array.isArray(raw)) {
    return String(raw[0] ?? '').trim();
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    return String(record.id ?? record.ID ?? '').trim();
  }
  return String(raw ?? '').trim();
}

/** Сброс кэша — только для тестов. */
export function resetOurEventsEntityTypeCacheForTests(): void {
  cachedEntityTypeId = null;
}

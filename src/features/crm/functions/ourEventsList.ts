import { callBxMethod, fetchAllCrmItems } from './bitrixApi';
import { extractScalarValues } from './bitrixFields';
import { getBitrixPortalOrigin } from './bitrixPath';
import { OUR_EVENTS_ENTITY_TYPE_ID } from './ourEventsMetric';
import { OUR_EVENTS_STAGE_ENTITY_ID, OUR_EVENT_MANAGER_FIELDS } from './monthlyEvents';

/** Категория проекта (A+, A, B+…). */
const EVENT_PROJECT_CATEGORY_FIELDS = ['ufCrm38_1785503717877', 'UF_CRM_38_1785503717877'];
/** Площадка. */
const EVENT_VENUE_FIELDS = ['ufCrm38_1785338002179', 'UF_CRM_38_1785338002179'];
/** Тип мероприятия (Гибрид / Онлайн / Очное). */
const EVENT_TYPE_FIELDS = ['ufCrm38TipMeropriyatiya', 'UF_CRM_38_TIP_MEROPRIYATIYA'];
/** Юр. лицо организатор. */
const EVENT_LEGAL_ENTITY_FIELDS = ['ufCrm38_1785338030055', 'UF_CRM_38_1785338030055'];
/** Город — смарт-процесс «Города» (1094). */
const EVENT_CITY_FIELDS = ['ufCrm38_1753082280', 'UF_CRM_38_1753082280'];
/** Целевая аудитория — iblock_element (IBLOCK_ID 216). */
const EVENT_AUDIENCE_FIELDS = ['ufCrm38_1753365559', 'UF_CRM_38_1753365559'];
/** Даты мероприятия. */
const EVENT_START_FIELDS = ['ufCrm38_1745307580193', 'UF_CRM_38_1745307580193'];
const EVENT_END_FIELDS = ['ufCrm38_1751875905992', 'UF_CRM_38_1751875905992'];
/** План выручки от спонсоров. */
const EVENT_PLAN_FIELDS = ['ufCrm38_1745221903440', 'UF_CRM_38_1745221903440'];
/** Собранная сумма. */
const EVENT_COLLECTED_FIELDS = ['ufCrm38_1750949359532', 'UF_CRM_38_1750949359532'];

/** Менеджер отдела продаж (employee, множественное). */
const EVENT_SALES_MANAGER_FIELDS = ['ufCrm38_1753082810', 'UF_CRM_38_1753082810'];
/** Менеджер проектного отдела (employee, множественное). */
const EVENT_PROJECT_MANAGER_FIELDS = ['ufCrm38_1788270129', 'UF_CRM_38_1788270129'];
/** Менеджер выставочного отдела (employee, множественное). */
const EVENT_EXPO_MANAGER_FIELDS = ['ufCrm38_1785338166', 'UF_CRM_38_1785338166'];
/** Проектная группа / Мед. студия (строка). */
const EVENT_PROJECT_GROUP_FIELDS = ['ufCrm38_1785418733045', 'UF_CRM_38_1785418733045'];
/** % Выполнения продаж (строка). */
const EVENT_SALES_PERCENT_FIELDS = ['ufCrm38_1750948951651', 'UF_CRM_38_1750948951651'];

/** Инфоблок «Нозологии / Целевые аудитории». */
const AUDIENCE_IBLOCK_ID = 216;
/** Смарт-процесс «Города». */
const CITIES_ENTITY_TYPE_ID = 1094;

export interface OurEventListRow {
  id: string;
  title: string;
  /** Целевая аудитория (нозологии), через запятую. */
  audience: string;
  /** Ответственный менеджер. */
  managerName: string;
  managerPhoto: string;
  /** id первого менеджера аккаунт-отдела — для фильтра. */
  managerId: string;
  /** Все id менеджеров аккаунт-отдела. */
  managerIds: string[];
  /** id менеджеров отдела продаж (ufCrm38_1753082810 — как в detail-report). */
  salesManagerIds: string[];
  /** Период: «01.10.2027 - 29.10.2027» либо одна дата. */
  period: string;
  /** Отсортированная дата начала (ISO). */
  startIso: string;
  /** Категория проекта (A+, A, B...). */
  projectCategory: string;
  /** Площадка. */
  venue: string;
  /** Тип мероприятия. */
  type: string;
  /** Город. */
  city: string;
  /** Юр. лицо организатор. */
  legalEntity: string;
  /** Стадия. */
  stage: string;
  /** id стадии — для фильтра. */
  stageId: string;
  /** Клиент (контакт). */
  client: string;
  clientId: string;
  /** План выручки от спонсоров. */
  plan: number;
  /** Собранная сумма. */
  collected: number;
  /** Менеджер отдела продаж. */
  salesManager: string;
  /** Менеджер проектного отдела. */
  projectManager: string;
  /** Менеджер выставочного отдела. */
  expoManager: string;
  /** Профили менеджеров с фото — для отображения аватаров. */
  salesManagers: EventUserRef[];
  projectManagers: EventUserRef[];
  expoManagers: EventUserRef[];
  /** Проектная группа / Мед. студия. */
  projectGroup: string;
  /** % Выполнения продаж. */
  salesPercent: string;
}

/** Первые 10 символов даты. */
function toIsoDay(raw: unknown): string {
  const match = String(raw ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function formatDay(iso: string): string {
  if (!iso) {
    return '';
  }
  const [year, month, date] = iso.split('-');
  return `${date}.${month}.${year}`;
}

/** Склеивает даты в период «начало - конец». */
export function formatEventPeriod(startIso: string, endIso: string): string {
  const start = formatDay(startIso);
  const end = formatDay(endIso);
  if (start && end && start !== end) {
    return `${start} - ${end}`;
  }
  return start || end;
}

/** Читает денежное значение вида «150000|RUB». */
export function parseMoney(value: unknown): number {
  if (value == null || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const normalized = String(value).replace(/\|RUB/gi, '').replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickText(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = extractScalarValues(item[key])[0];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function pickIds(item: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const raw = item[key];
    if (Array.isArray(raw)) {
      const ids = raw.map((entry) => String(entry)).filter(Boolean);
      if (ids.length) {
        return ids;
      }
    } else if (raw != null && raw !== '') {
      return [String(raw)];
    }
  }
  return [];
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

/** Названия стадий воронки мероприятия. */
async function loadStageNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const raw = await callBxMethod<Array<Record<string, unknown>>>('crm.status.list', {
      filter: { ENTITY_ID: OUR_EVENTS_STAGE_ENTITY_ID },
    });
    (Array.isArray(raw) ? raw : []).forEach((stage) => {
      const statusId = stage.STATUS_ID ?? stage.statusId;
      const name = stage.NAME ?? stage.name;
      if (statusId != null && name != null && String(name).trim()) {
        names.set(String(statusId), String(name).trim());
      }
    });
  } catch (error) {
    console.warn('Не удалось загрузить стадии мероприятий:', error);
  }
  return names;
}

/** Названия вариантов перечисления из crm.item.fields. */
async function loadEnumLabels(fieldNames: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  try {
    const raw = await callBxMethod<{ fields?: Record<string, Record<string, unknown>> }>(
      'crm.item.fields',
      { entityTypeId: OUR_EVENTS_ENTITY_TYPE_ID, useOriginalUfNames: 'N' },
    );
    const fields = raw?.fields ?? {};
    const normalized = new Map<string, Record<string, unknown>>();
    Object.entries(fields).forEach(([key, value]) => normalized.set(key.toLowerCase(), value));

    fieldNames.forEach((name) => {
      const field = normalized.get(name.toLowerCase());
      const items = field?.items ?? field?.LIST;
      if (!items) {
        return;
      }
      const list = Array.isArray(items) ? items : Object.values(items);
      list.forEach((entry) => {
        const record = entry as Record<string, unknown>;
        const id = record?.ID ?? record?.id;
        const label = record?.VALUE ?? record?.value;
        if (id != null && id !== '' && label != null && String(label).trim()) {
          labels.set(String(id), String(label).trim());
        }
      });
    });
  } catch (error) {
    console.warn('Не удалось загрузить перечисления мероприятий:', error);
  }
  return labels;
}

/** Названия элементов инфоблока (целевая аудитория). */
async function loadIblockLabels(ids: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) {
    return labels;
  }

  await Promise.all(chunk(unique, 50).map(async (idsChunk) => {
    try {
      const raw = await callBxMethod<Array<Record<string, unknown>>>('lists.element.get', {
        IBLOCK_TYPE_ID: 'lists',
        IBLOCK_ID: AUDIENCE_IBLOCK_ID,
        FILTER: { ID: idsChunk },
      });
      (Array.isArray(raw) ? raw : []).forEach((element) => {
        const id = element.ID ?? element.id;
        const name = element.NAME ?? element.name;
        if (id != null && name != null && String(name).trim()) {
          labels.set(String(id), String(name).trim());
        }
      });
    } catch (error) {
      console.warn('Не удалось загрузить целевую аудиторию:', error);
    }
  }));

  return labels;
}

/** Названия городов (смарт-процесс 1094). */
async function loadCityLabels(ids: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) {
    return labels;
  }

  await Promise.all(chunk(unique, 50).map(async (idsChunk) => {
    try {
      const raw = await callBxMethod<
        { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
      >('crm.item.list', {
        entityTypeId: CITIES_ENTITY_TYPE_ID,
        filter: { '@id': idsChunk },
        select: ['id', 'title'],
      });
      const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
      items.forEach((item) => {
        const id = item.id ?? item.ID;
        const title = item.title ?? item.TITLE;
        if (id != null && title != null && String(title).trim()) {
          labels.set(String(id), String(title).trim());
        }
      });
    } catch (error) {
      console.warn('Не удалось загрузить города:', error);
    }
  }));

  return labels;
}

/** Контакты клиентов. */
async function loadContactNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(ids.filter((id) => id && id !== '0'))];
  if (!unique.length) {
    return names;
  }

  await Promise.all(chunk(unique, 50).map(async (idsChunk) => {
    try {
      const raw = await callBxMethod<Array<Record<string, unknown>>>('crm.contact.list', {
        filter: { '@ID': idsChunk },
        select: ['ID', 'NAME', 'LAST_NAME'],
      });
      (Array.isArray(raw) ? raw : []).forEach((contact) => {
        const id = contact.ID ?? contact.id;
        const name = [contact.LAST_NAME, contact.NAME]
          .map((part) => String(part ?? '').trim())
          .filter(Boolean)
          .join(' ');
        if (id != null && name) {
          names.set(String(id), name);
        }
      });
    } catch (error) {
      console.warn('Не удалось загрузить клиентов:', error);
    }
  }));

  return names;
}

/** Профиль сотрудника: ФИО и фото. */
export interface EventUserRef {
  id: string;
  name: string;
  photo: string;
}

/** Единый формат ФИО без отчества: «Фамилия Имя» без лишних пробелов. */
export function formatUserName(user: Record<string, unknown>): string {
  const shortName = [user.LAST_NAME, user.NAME]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');

  if (shortName) {
    return shortName;
  }

  // Если имени или фамилии нет, используем то, что есть, кроме отчества
  const fallback = String(user.NAME || user.LAST_NAME || user.SECOND_NAME || '').trim();
  return fallback || `Пользователь #${user.ID ?? user.id ?? ''}`;
}

async function loadUsers(
  ids: string[],
): Promise<Map<string, { name: string; photo: string }>> {
  const users = new Map<string, { name: string; photo: string }>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) {
    return users;
  }

  try {
    const raw = await callBxMethod<Array<Record<string, unknown>>>('user.get', {
      FILTER: { '@ID': unique },
    });
    (Array.isArray(raw) ? raw : []).forEach((user) => {
      const id = user.ID ?? user.id;
      // Единый порядок ФИО: Фамилия Имя Отчество.
      const name = formatUserName(user);
      if (id != null && name) {
        users.set(String(id), {
          name,
          photo: resolvePhoto(user.PERSONAL_PHOTO),
        });
      }
    });
  } catch (error) {
    console.warn('Не удалось загрузить ответственных:', error);
  }

  return users;
}

function resolvePhoto(photo: unknown): string {
  const raw = typeof photo === 'string'
    ? photo
    : photo && typeof photo === 'object'
      ? String(
        (photo as Record<string, unknown>).src
        || (photo as Record<string, unknown>).url
        || (photo as Record<string, unknown>).URL
        || '',
      )
      : '';

  if (!raw) {
    return '';
  }
  if (raw.startsWith('http')) {
    return raw;
  }
  if (raw.startsWith('//')) {
    return `https:${raw}`;
  }
  return `${getBitrixPortalOrigin()}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

interface RawEvent {
  id: string;
  title: string;
  stageId: string;
  /** Стандартный ответственный (резерв). */
  assignedId: string;
  /** Менеджеры аккаунт-отдела из доп. поля. */
  managerIds: string[];
  contactId: string;
  startIso: string;
  endIso: string;
  audienceIds: string[];
  cityId: string;
  typeId: string;
  categoryId: string;
  legalEntityIds: string[];
  venue: string;
  plan: number;
  collected: number;
  salesManagerIds: string[];
  projectManagerIds: string[];
  expoManagerIds: string[];
  projectGroup: string;
  salesPercent: string;
}

/**
 * Все мероприятия (смарт-процесс 1052) для вкладки «Наши мероприятия (NEW)».
 * Числовые id справочников разворачиваются в названия.
 */
export async function loadOurEventsList(): Promise<OurEventListRow[]> {
  let items: Record<string, unknown>[] = [];

  try {
    items = await fetchAllCrmItems(
      OUR_EVENTS_ENTITY_TYPE_ID,
      null,
      {},
      { order: { id: 'DESC' } },
    );
  } catch (error) {
    console.warn('Не удалось загрузить мероприятия:', error);
    return [];
  }

  const raw: RawEvent[] = items.map((item) => ({
    id: String(item.id ?? item.ID ?? ''),
    title: String(item.title ?? item.TITLE ?? '').trim() || 'Без названия',
    stageId: String(item.stageId ?? item.STAGE_ID ?? '').trim(),
    assignedId: String(item.assignedById ?? item.ASSIGNED_BY_ID ?? '').trim(),
    managerIds: pickIds(item, OUR_EVENT_MANAGER_FIELDS),
    contactId: String(extractScalarValues(item.contactId ?? item.CONTACT_ID)[0] ?? '').trim(),
    startIso: toIsoDay(pickText(item, EVENT_START_FIELDS)),
    endIso: toIsoDay(pickText(item, EVENT_END_FIELDS)),
    audienceIds: pickIds(item, EVENT_AUDIENCE_FIELDS),
    cityId: pickIds(item, EVENT_CITY_FIELDS)[0] ?? '',
    typeId: pickIds(item, EVENT_TYPE_FIELDS)[0] ?? '',
    categoryId: pickIds(item, EVENT_PROJECT_CATEGORY_FIELDS)[0] ?? '',
    legalEntityIds: pickIds(item, EVENT_LEGAL_ENTITY_FIELDS),
    venue: pickText(item, EVENT_VENUE_FIELDS),
    plan: parseMoney(pickText(item, EVENT_PLAN_FIELDS)),
    collected: parseMoney(pickText(item, EVENT_COLLECTED_FIELDS)),
    salesManagerIds: pickIds(item, EVENT_SALES_MANAGER_FIELDS),
    projectManagerIds: pickIds(item, EVENT_PROJECT_MANAGER_FIELDS),
    expoManagerIds: pickIds(item, EVENT_EXPO_MANAGER_FIELDS),
    projectGroup: pickText(item, EVENT_PROJECT_GROUP_FIELDS),
    salesPercent: pickText(item, EVENT_SALES_PERCENT_FIELDS),
  }));

  const [
    stageNames,
    typeLabels,
    categoryLabels,
    legalEntityLabels,
    audienceLabels,
    cityLabels,
    users,
    clientNames,
  ] = await Promise.all([
    loadStageNames(),
    loadEnumLabels(EVENT_TYPE_FIELDS),
    loadEnumLabels(EVENT_PROJECT_CATEGORY_FIELDS),
    loadEnumLabels(EVENT_LEGAL_ENTITY_FIELDS),
    loadIblockLabels(raw.flatMap((row) => row.audienceIds)),
    loadCityLabels(raw.map((row) => row.cityId)),
    loadUsers([
      ...raw.map((row) => row.assignedId),
      ...raw.flatMap((row) => row.managerIds),
      ...raw.flatMap((row) => row.salesManagerIds),
      ...raw.flatMap((row) => row.projectManagerIds),
      ...raw.flatMap((row) => row.expoManagerIds),
    ]),
    loadContactNames(raw.map((row) => row.contactId)),
  ]);

  const joinLabels = (ids: string[], labels: Map<string, string>): string =>
    ids.map((id) => labels.get(id) ?? '').filter(Boolean).join(', ');

  /** Имена сотрудников по списку id. */
  const userNames = (ids: string[]): string =>
    ids
      .map((id) => users.get(id)?.name ?? '')
      .filter(Boolean)
      .join(', ');

  /** Профили сотрудников (id + ФИО + фото) по списку id. */
  const userRefs = (ids: string[]): EventUserRef[] => ids
    .map((id) => {
      const user = users.get(id);
      return user?.name ? { id, name: user.name, photo: user.photo } : null;
    })
    .filter((user): user is EventUserRef => user !== null);

  return raw.map((row) => {
    // Ответственный — только менеджеры аккаунт-отдела.
    // Если поле не заполнено — поле пустое (стандартный assignedId НЕ подставляется).
    const managerIds = row.managerIds;
    const managers = managerIds
      .map((id) => users.get(id))
      .filter((user): user is { name: string; photo: string } => Boolean(user?.name));
    const firstManager = managers[0];

    return {
      id: row.id,
      title: row.title,
      audience: joinLabels(row.audienceIds, audienceLabels),
      managerName: managers.map((user) => user.name).join(', '),
      managerPhoto: firstManager?.photo ?? '',
      managerId: managerIds[0] ?? '',
      managerIds,
      salesManagerIds: row.salesManagerIds,
      salesManager: userNames(row.salesManagerIds),
      projectManager: userNames(row.projectManagerIds),
      expoManager: userNames(row.expoManagerIds),
      salesManagers: userRefs(row.salesManagerIds),
      projectManagers: userRefs(row.projectManagerIds),
      expoManagers: userRefs(row.expoManagerIds),
      projectGroup: row.projectGroup,
      salesPercent: row.salesPercent,
      period: formatEventPeriod(row.startIso, row.endIso),
      startIso: row.startIso,
      projectCategory: categoryLabels.get(row.categoryId) ?? '',
      venue: row.venue,
      type: typeLabels.get(row.typeId) ?? '',
      city: cityLabels.get(row.cityId) ?? '',
      legalEntity: joinLabels(row.legalEntityIds, legalEntityLabels),
      stage: stageNames.get(row.stageId) ?? '',
      stageId: row.stageId,
      client: clientNames.get(row.contactId) ?? '',
      clientId: row.contactId,
      plan: row.plan,
      collected: row.collected,
    };
  });
}

/** Список стадий для фильтра. */
export async function loadEventStageOptions(): Promise<Array<{ id: string; title: string }>> {
  const names = await loadStageNames();
  return [...names.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
}

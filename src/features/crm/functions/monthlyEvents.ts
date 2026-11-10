import { callBxMethod, fetchAllCrmItems } from './bitrixApi';
import { extractScalarValues, unwrapFieldsResponse, type NamedCrmField } from './bitrixFields';
import { getBitrixPortalOrigin, openBitrixPath } from './bitrixPath';
import {
  OUR_EVENTS_ENTITY_TYPE_ID,
  getOurEventsEntityTypeId,
} from './ourEventsMetric';
import { COMPETITOR_EVENTS_ENTITY_TYPE_ID } from './monthlyReport';
import type { MonthlyReportPeriod } from './monthlyReportSubmit';

/** Дата начала/завершения наших мероприятий (смарт-процесс 1052). */
export const OUR_EVENT_START_FIELDS = [
  'ufCrm38_1745307580193',
  'UF_CRM_38_1745307580193',
];
export const OUR_EVENT_END_FIELDS = [
  'ufCrm38_1751875905992',
  'UF_CRM_38_1751875905992',
];

/** Тип наших мероприятий — enumeration (Гибрид / Онлайн / Очное). */
export const OUR_EVENT_TYPE_FIELDS = [
  'ufCrm38TipMeropriyatiya',
  'UF_CRM_38_TIP_MEROPRIYATIYA',
];
/** Город наших мероприятий — смарт-процесс «Города» (entityTypeId 1094). */
export const OUR_EVENT_CITY_FIELDS = [
  'ufCrm38_1753082280',
  'UF_CRM_38_1753082280',
];
/** Целевая аудитория — iblock_element (IBLOCK_ID 216), множественное. */
export const OUR_EVENT_AUDIENCE_FIELDS = [
  'ufCrm38_1753365559',
  'UF_CRM_38_1753365559',
];
/** Клиент мероприятия — контакт. */
export const OUR_EVENT_CLIENT_FIELDS = ['contactId', 'CONTACT_ID'];
/** Стадия — crm_status (DYNAMIC_1052_STAGE_110). */
export const OUR_EVENT_STAGE_FIELDS = ['stageId', 'STAGE_ID'];

/** Идентификатор справочника стадий наших мероприятий (воронка 110). */
export const OUR_EVENTS_STAGE_ENTITY_ID = 'DYNAMIC_1052_STAGE_110';

/** Дата начала/завершения мероприятий конкурентов (смарт-процесс 1210). */
export const COMPETITOR_EVENT_START_FIELDS = [
  'ufCrm120_1782912304583',
  'UF_CRM_120_1782912304583',
];
export const COMPETITOR_EVENT_END_FIELDS = [
  'ufCrm120_1782912316902',
  'UF_CRM_120_1782912316902',
];

/** Тип мероприятия конкурентов — enumeration. */
export const COMPETITOR_EVENT_TYPE_FIELDS = [
  'ufCrm120_1782912178006',
  'UF_CRM_120_1782912178006',
];
/** Нозология — iblock_element (IBLOCK_ID 216, тип списка lists). */
export const COMPETITOR_EVENT_NOSOLOGY_FIELDS = [
  'ufCrm120_1782912441',
  'UF_CRM_120_1782912441',
];
/** Город — динамический смарт-процесс «Города» (entityTypeId 1094). */
export const COMPETITOR_EVENT_CITY_FIELDS = [
  'ufCrm120_1782912501',
  'UF_CRM_120_1782912501',
];

/** Смарт-процесс «Города» — справочник для поля «Город». */
export const CITIES_ENTITY_TYPE_ID = 1094;

/** Клиент/партнёр мероприятия. */
const EVENT_PARTNER_FIELDS = ['contactId', 'CONTACT_ID'];
/** Компания мероприятия. */
const EVENT_COMPANY_FIELDS = ['companyId', 'COMPANY_ID'];
/**
 * Ответственный — «Менеджер аккаунт отдела» (привязка к сотруднику, множественная).
 * Если поле не заполнено — поле пустое (стандартный assignedById не подставляется).
 */
export const OUR_EVENT_MANAGER_FIELDS = [
  'ufCrm38_1785338330',
  'UF_CRM_38_1785338330',
];
const EVENT_ASSIGNED_FIELDS = ['assignedById', 'ASSIGNED_BY_ID'];

/** Сколько id отправляем в одном batched-запросе справочника. */
const LOOKUP_CHUNK_SIZE = 50;

export interface EventTableRow {
  id: string;
  title: string;
  company: string;
  assigned: string;
  type: string;
  nosology: string;
  city: string;
  startDate: string;
  endDate: string;
  /** Клиент (контакт). */
  client: string;
  /** Целевая аудитория. */
  audience: string;
  /** Стадия. */
  stage: string;
  /** id ответственного — для аватара. */
  assignedId: string;
  /** Ссылка на фото ответственного (пусто, если нет). */
  assignedPhoto: string;
  /** id всех менеджеров аккаунт-отдела. */
  managerIds: string[];
}

export interface EventDateFields {
  start: string[];
  end: string[];
}

/** Описание полей мероприятия: даты + дополнительные колонки. */
export interface EventFieldConfig extends EventDateFields {
  type?: string[];
  nosology?: string[];
  city?: string[];
  /** Клиент — поле-контакт. */
  client?: string[];
  /** Целевая аудитория — элементы инфоблока. */
  audience?: string[];
  /** Стадия — crm_status. */
  stage?: string[];
  /** Тип идентификатора стадии для crm.status.list (например DYNAMIC_1052_STAGE_110). */
  stageEntityId?: string;
}

/** Значение поля-справочника из ответа crm.item.*: { id, value } либо голый id. */
function readRefIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => readRefIds(entry));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const id = record.id ?? record.ID;
    return id != null && id !== '' ? [String(id)] : [];
  }
  if (value == null || value === '') {
    return [];
  }
  return [String(value)];
}

/** Читает первую непустую строку по списку возможных ключей. */
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
    const ids = readRefIds(item[key]);
    if (ids.length) {
      return ids;
    }
  }
  return [];
}

/** Разбивает массив на порции — чтобы не превысить лимит фильтра. */
function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

/** Названия вариантов поля-enumeration (например «Тип мероприятия»). */
async function loadEnumerationLabels(
  entityTypeId: number,
  fieldNames: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();

  let fields: Record<string, NamedCrmField>;
  try {
    const raw = await callBxMethod<unknown>('crm.item.fields', {
      entityTypeId,
      useOriginalUfNames: 'N',
    });
    fields = unwrapFieldsResponse<Record<string, NamedCrmField>>(raw);
  } catch (error) {
    console.warn('Не удалось загрузить поля смарт-процесса:', error);
    return labels;
  }

  const normalized = new Map<string, NamedCrmField>();
  Object.entries(fields).forEach(([key, field]) => {
    normalized.set(key.toLowerCase(), field);
  });

  fieldNames.forEach((name) => {
    const field = normalized.get(name.toLowerCase());
    const items = field?.items ?? field?.LIST;
    if (!items) {
      return;
    }
    const list = Array.isArray(items) ? items : Object.values(items);
    list.forEach((entry) => {
      const record = entry as { ID?: string | number; id?: string | number; VALUE?: string; value?: string };
      const id = record?.ID ?? record?.id;
      const label = record?.VALUE ?? record?.value;
      if (id != null && id !== '' && label != null && String(label).trim()) {
        labels.set(String(id), String(label).trim());
      }
    });
  });

  return labels;
}

/** Названия элементов смарт-процесса-справочника (например «Города»). */
async function loadCrmRefLabels(
  refEntityTypeId: number,
  ids: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) {
    return labels;
  }

  const chunks = chunk(uniqueIds, LOOKUP_CHUNK_SIZE);
  await Promise.all(chunks.map(async (idsChunk) => {
    try {
      const raw = await callBxMethod<
        { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
      >('crm.item.list', {
        entityTypeId: refEntityTypeId,
        filter: { '@id': idsChunk },
        select: ['id', 'title'],
      });
      const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
      items.forEach((item) => {
        const id = item.id ?? item.ID;
        const title = item.title ?? item.TITLE;
        if (id != null && id !== '' && title != null && String(title).trim()) {
          labels.set(String(id), String(title).trim());
        }
      });
    } catch (error) {
      console.warn(`Не удалось загрузить справочник (entityTypeId ${refEntityTypeId}):`, error);
    }
  }));

  return labels;
}

/** Названия элементов инфоблока (например «Нозология», IBLOCK_ID 216). */
async function loadIblockElementLabels(
  iblockId: number,
  ids: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length || !iblockId) {
    return labels;
  }

  const chunks = chunk(uniqueIds, LOOKUP_CHUNK_SIZE);
  await Promise.all(chunks.map(async (idsChunk) => {
    try {
      const raw = await callBxMethod<Array<Record<string, unknown>>>(
        'lists.element.get',
        {
          IBLOCK_TYPE_ID: 'lists',
          IBLOCK_ID: iblockId,
          FILTER: { ID: idsChunk },
        },
      );
      const items = Array.isArray(raw) ? raw : [];
      items.forEach((item) => {
        const id = item.ID ?? item.id;
        const name = item.NAME ?? item.name;
        if (id != null && id !== '' && name != null && String(name).trim()) {
          labels.set(String(id), String(name).trim());
        }
      });
    } catch (error) {
      console.warn(`Не удалось загрузить элементы инфоблока ${iblockId}:`, error);
    }
  }));

  return labels;
}

/** Названия контактов через crm.contact.list. */
async function loadContactNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) {
    return names;
  }

  const chunks = chunk(uniqueIds, LOOKUP_CHUNK_SIZE);
  await Promise.all(chunks.map(async (idsChunk) => {
    try {
      const raw = await callBxMethod<
        Array<Record<string, unknown>> | Record<string, unknown>
      >('crm.contact.list', {
        filter: { '@ID': idsChunk },
        select: ['ID', 'NAME', 'LAST_NAME'],
      });
      const list = Array.isArray(raw) ? raw : [];
      list.forEach((contact) => {
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
      console.warn('Не удалось загрузить контакты:', error);
    }
  }));

  return names;
}

/** Названия стадий через crm.status.list (например DYNAMIC_1052_STAGE_110). */
async function loadStageNames(stageEntityId: string): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (!stageEntityId) {
    return names;
  }

  try {
    const raw = await callBxMethod<Array<Record<string, unknown>>>('crm.status.list', {
      filter: { ENTITY_ID: stageEntityId },
    });
    (Array.isArray(raw) ? raw : []).forEach((stage) => {
      const statusId = stage.STATUS_ID ?? stage.statusId;
      const name = stage.NAME ?? stage.name;
      if (statusId != null && name != null && String(name).trim()) {
        names.set(String(statusId), String(name).trim());
      }
    });
  } catch (error) {
    console.warn(`Не удалось загрузить стадии ${stageEntityId}:`, error);
  }

  return names;
}

/** Нормализует дату вида 2026-10-05T00:00:00+03:00 в ДД.ММ.ГГГГ. */
export function formatEventDate(raw: string): string {
  const text = String(raw ?? '').trim();
  if (!text) {
    return '';
  }

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  return date.toLocaleDateString('ru-RU');
}

/** Первые 10 символов даты (YYYY-MM-DD) — для сравнения периодов. */
function toIsoDay(raw: string): string {
  const match = String(raw ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/**
 * Мероприятие попадает в месяц, если пересекается с ним:
 * начало не позже конца месяца И конец не раньше начала месяца.
 * Если дата завершения не заполнена — считаем её равной дате начала.
 */
export function eventOverlapsPeriod(
  startRaw: string,
  endRaw: string,
  period: MonthlyReportPeriod,
): boolean {
  const start = toIsoDay(startRaw);
  const end = toIsoDay(endRaw) || start;

  if (!start && !end) {
    return false;
  }

  const month = String(period.month).padStart(2, '0');
  const periodStart = `${period.year}-${month}-01`;
  const lastDay = new Date(Number(period.year), period.month, 0).getDate();
  const periodEnd = `${period.year}-${month}-${String(lastDay).padStart(2, '0')}`;

  const effectiveStart = start || end;
  const effectiveEnd = end || start;

  return effectiveStart <= periodEnd && effectiveEnd >= periodStart;
}

/** Склеивает названия по id; если ничего не нашлось — пустая строка. */
export function joinRefLabels(
  ids: string[],
  labels: Map<string, string>,
): string {
  if (!ids.length) {
    return '';
  }
  return ids
    .map((id) => labels.get(id) ?? '')
    .filter(Boolean)
    .join(', ');
}

interface RawEventRow {
  id: string;
  title: string;
  companyId: string;
  /** Стандартный ответственный (резерв). */
  assignedId: string;
  /** Менеджеры аккаунт-отдела из доп. поля. */
  managerIds: string[];
  typeId: string;
  nosologyIds: string[];
  cityId: string;
  clientId: string;
  audienceIds: string[];
  stageId: string;
  rawStart: string;
  rawEnd: string;
}

function mapRawRow(item: Record<string, unknown>, fields: EventFieldConfig): RawEventRow {
  return {
    id: String(item.id ?? item.ID ?? ''),
    title: String(item.title ?? item.TITLE ?? '').trim() || 'Без названия',
    companyId: pickText(item, EVENT_COMPANY_FIELDS),
    assignedId: pickText(item, EVENT_ASSIGNED_FIELDS),
    managerIds: pickIds(item, OUR_EVENT_MANAGER_FIELDS),
    typeId: fields.type ? (pickIds(item, fields.type)[0] ?? '') : '',
    nosologyIds: fields.nosology ? pickIds(item, fields.nosology) : [],
    cityId: fields.city ? (pickIds(item, fields.city)[0] ?? '') : '',
    clientId: fields.client ? (pickIds(item, fields.client)[0] ?? '') : '',
    audienceIds: fields.audience ? pickIds(item, fields.audience) : [],
    // Стадия приходит строкой (DT1052_110:UC_XWF0KT), а не объектом.
    stageId: fields.stage ? pickText(item, fields.stage) : '',
    rawStart: pickText(item, fields.start),
    rawEnd: pickText(item, fields.end),
  };
}

/** Профиль ответственного: имя и абсолютная ссылка на фото. */
export interface EventUserDisplay {
  name: string;
  photo: string;
}

/** Собирает абсолютный URL фото пользователя Bitrix. */
export function resolveUserPhotoUrl(photo: unknown): string {
  const rawPhoto = typeof photo === 'string'
    ? photo
    : photo && typeof photo === 'object'
      ? String(
        (photo as Record<string, unknown>).src
        || (photo as Record<string, unknown>).url
        || (photo as Record<string, unknown>).URL
        || '',
      )
      : '';

  if (!rawPhoto) {
    return '';
  }
  if (rawPhoto.startsWith('http')) {
    return rawPhoto;
  }
  if (rawPhoto.startsWith('//')) {
    return `https:${rawPhoto}`;
  }

  const origin = getBitrixPortalOrigin();
  return `${origin}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
}

/** Профили ответственных через user.get (имя + фото). */
async function loadUserDisplays(
  ids: string[],
): Promise<Map<string, EventUserDisplay>> {
  const displays = new Map<string, EventUserDisplay>();
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) {
    return displays;
  }

  try {
    const users = await callBxMethod<Array<Record<string, unknown>>>('user.get', {
      FILTER: { '@ID': uniqueIds },
    });
    (Array.isArray(users) ? users : []).forEach((user) => {
      const id = user.ID ?? user.id;
      const name = [user.LAST_NAME, user.NAME].filter(Boolean).join(' ').trim();
      if (id != null && name) {
        displays.set(String(id), {
          name,
          photo: resolveUserPhotoUrl(user.PERSONAL_PHOTO),
        });
      }
    });
  } catch (error) {
    console.warn('Не удалось загрузить ответственных:', error);
  }

  return displays;
}

/** Названия компаний через crm.company.list. */
async function loadCompanyNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const uniqueIds = [...new Set(ids.filter((id) => id && id !== '0'))];
  if (!uniqueIds.length) {
    return names;
  }

  const chunks = chunk(uniqueIds, LOOKUP_CHUNK_SIZE);
  await Promise.all(chunks.map(async (idsChunk) => {
    try {
      const raw = await callBxMethod<
        Array<Record<string, unknown>> | Record<string, unknown>
      >('crm.company.list', {
        filter: { '@ID': idsChunk },
        select: ['ID', 'TITLE'],
      });
      const list = Array.isArray(raw) ? raw : [];
      list.forEach((company) => {
        const id = company.ID ?? company.id;
        const title = company.TITLE ?? company.title;
        if (id != null && title != null && String(title).trim()) {
          names.set(String(id), String(title).trim());
        }
      });
    } catch (error) {
      console.warn('Не удалось загрузить компании:', error);
    }
  }));

  return names;
}

/**
 * Разворачивает числовые id в названия:
 * тип — enumeration, нозология и целевая аудитория — инфоблок lists,
 * город — смарт-процесс, клиент/компания — crm.*, ответственный — user.get,
 * стадия — crm.status.
 */
async function resolveRows(
  rows: RawEventRow[],
  entityTypeId: number,
  fields: EventFieldConfig,
): Promise<EventTableRow[]> {
  const [
    typeLabels,
    nosologyLabels,
    cityLabels,
    audienceLabels,
    userDisplays,
    companyNames,
    clientNames,
    stageNames,
  ] = await Promise.all([
    fields.type
      ? loadEnumerationLabels(entityTypeId, fields.type)
      : Promise.resolve(new Map<string, string>()),
    fields.nosology
      ? loadIblockElementLabels(
        216,
        [...new Set(rows.flatMap((row) => row.nosologyIds))],
      )
      : Promise.resolve(new Map<string, string>()),
    fields.city
      ? loadCrmRefLabels(CITIES_ENTITY_TYPE_ID, rows.map((row) => row.cityId))
      : Promise.resolve(new Map<string, string>()),
    fields.audience
      ? loadIblockElementLabels(
        216,
        [...new Set(rows.flatMap((row) => row.audienceIds))],
      )
      : Promise.resolve(new Map<string, string>()),
    loadUserDisplays([
      ...rows.map((row) => row.assignedId),
      ...rows.flatMap((row) => row.managerIds),
    ]),
    loadCompanyNames(rows.map((row) => row.companyId)),
    loadContactNames(rows.map((row) => row.clientId)),
    fields.stageEntityId
      ? loadStageNames(fields.stageEntityId)
      : Promise.resolve(new Map<string, string>()),
  ]);

  return rows.map((row) => {
    // Ответственный:
    // Для наших мероприятий ответственный — это только «Менеджер аккаунт-отдела».
    // Если поле не заполнено — поле пустое (стандартный assignedId НЕ подставляется).
    // Для мероприятий конкурентов менеджеров аккаунт-отдела нет — берём стандартного ответственного.
    const isOurEvents = entityTypeId === OUR_EVENTS_ENTITY_TYPE_ID;
    const managerIds = isOurEvents
      ? row.managerIds
      : (row.managerIds.length ? row.managerIds : (row.assignedId ? [row.assignedId] : []));
    const managers = managerIds
      .map((id) => userDisplays.get(id))
      .filter((user): user is EventUserDisplay => Boolean(user?.name));
    const firstManager = managers[0];

    return {
      id: row.id,
      title: row.title,
      company: companyNames.get(row.companyId) ?? '',
      assigned: managers.map((user) => user.name).join(', '),
      assignedId: firstManager ? (managerIds[0] ?? '') : '',
      assignedPhoto: firstManager?.photo ?? '',
      managerIds,
      type: typeLabels.get(row.typeId) ?? '',
      nosology: joinRefLabels(row.nosologyIds, nosologyLabels),
      city: cityLabels.get(row.cityId) ?? '',
      client: clientNames.get(row.clientId) ?? '',
      audience: joinRefLabels(row.audienceIds, audienceLabels),
      stage: stageNames.get(row.stageId) ?? '',
      startDate: formatEventDate(row.rawStart),
      endDate: formatEventDate(row.rawEnd),
    };
  });
}

async function loadEventRows(
  entityTypeId: number,
  fields: EventFieldConfig,
  period?: MonthlyReportPeriod,
): Promise<EventTableRow[]> {
  let items: Record<string, unknown>[] = [];

  try {
    items = await fetchAllCrmItems(
      entityTypeId,
      null,
      {},
      { order: { id: 'DESC' } },
    );
  } catch (error) {
    console.warn(`Не удалось загрузить мероприятия (entityTypeId ${entityTypeId}):`, error);
    return [];
  }

  const rows = items
    .map((item) => mapRawRow(item, fields))
    .filter((row) => !period || eventOverlapsPeriod(row.rawStart, row.rawEnd, period));

  if (!rows.length) {
    return [];
  }

  return resolveRows(rows, entityTypeId, fields);
}

/** Мероприятия (смарт-процесс 1052), пересекающиеся с периодом. */
export async function loadOurEventsForTable(
  period?: MonthlyReportPeriod,
): Promise<EventTableRow[]> {
  const entityTypeId = await getOurEventsEntityTypeId();
  return loadEventRows(
    entityTypeId,
    {
      start: OUR_EVENT_START_FIELDS,
      end: OUR_EVENT_END_FIELDS,
      type: OUR_EVENT_TYPE_FIELDS,
      city: OUR_EVENT_CITY_FIELDS,
      client: OUR_EVENT_CLIENT_FIELDS,
      audience: OUR_EVENT_AUDIENCE_FIELDS,
      stage: OUR_EVENT_STAGE_FIELDS,
      stageEntityId: OUR_EVENTS_STAGE_ENTITY_ID,
    },
    period,
  );
}

/** Мероприятия конкурентов (смарт-процесс 1210), пересекающиеся с периодом. */
export async function loadCompetitorEventsForTable(
  period?: MonthlyReportPeriod,
): Promise<EventTableRow[]> {
  return loadEventRows(
    COMPETITOR_EVENTS_ENTITY_TYPE_ID,
    {
      start: COMPETITOR_EVENT_START_FIELDS,
      end: COMPETITOR_EVENT_END_FIELDS,
      type: COMPETITOR_EVENT_TYPE_FIELDS,
      nosology: COMPETITOR_EVENT_NOSOLOGY_FIELDS,
      city: COMPETITOR_EVENT_CITY_FIELDS,
    },
    period,
  );
}

export function buildOurEventDetailsPath(eventId: string): string {
  return `/crm/type/${OUR_EVENTS_ENTITY_TYPE_ID}/details/${eventId}/`;
}

export function buildCompetitorEventDetailsPath(eventId: string): string {
  return `/crm/type/${COMPETITOR_EVENTS_ENTITY_TYPE_ID}/details/${eventId}/`;
}

export function openEventDetails(path: string): void {
  if (!path) {
    return;
  }
  openBitrixPath(path);
}

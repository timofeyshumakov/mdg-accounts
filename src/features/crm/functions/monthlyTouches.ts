import { callBxMethod, fetchAllCrmItems } from './bitrixApi';
import {
  extractScalarValues,
  getRecordFieldValue,
  NamedCrmField,
  unwrapFieldsResponse,
} from './bitrixFields';
import type { MonthlyTouchItem, TouchKind } from '../mock/monthlyReportData';

export const TOUCHES_ENTITY_TYPE_ID = 1240;

/** Вид касания. */
export const TOUCH_TYPE_FIELD = 'UF_CRM_132_1787151115483';
export const TOUCH_TYPE_FIELD_CAMEL = 'ufCrm132_1787151115483';

/** Комментарий. */
export const TOUCH_COMMENT_FIELD = 'ufCrm132_1786008277689';
export const TOUCH_COMMENT_FIELD_UPPER = 'UF_CRM_132_1786008277689';

/** Дата коммуникации. */
export const TOUCH_DATE_FIELD = 'ufCrm132_1786008314575';
export const TOUCH_DATE_FIELD_UPPER = 'UF_CRM_132_1786008314575';

const TOUCH_TYPE_FIELD_META: NamedCrmField = {
  title: 'Вид',
  fieldName: TOUCH_TYPE_FIELD_CAMEL,
  upperName: TOUCH_TYPE_FIELD,
  type: 'enumeration',
};

export interface TouchTypeOption {
  id: string;
  title: string;
  kind: TouchKind;
}

export function buildTouchDetailsPath(touchId: string | number): string {
  return `/crm/type/${TOUCHES_ENTITY_TYPE_ID}/details/${touchId}/`;
}

export function buildTouchCreatePath(contactId: string): string {
  return `/crm/type/${TOUCHES_ENTITY_TYPE_ID}/details/0/?contactId=${encodeURIComponent(contactId)}`;
}

export function formatTouchDateInput(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveDefaultTouchTypeId(
  options: TouchTypeOption[],
  kind?: TouchKind | null,
): string {
  if (!options.length) {
    return '';
  }
  if (kind && kind !== 'other') {
    const match = options.find((option) => option.kind === kind);
    if (match) {
      return match.id;
    }
  }
  return options[0].id;
}

function firstScalar(value: unknown): string {
  const values = extractScalarValues(value);
  return values[0] ? String(values[0]) : '';
}

function parseDateParts(value: unknown): { month: number; year: string; createdTime: string } {
  const createdTime = String(value ?? '');
  const match = createdTime.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return { year: match[1], month: Number(match[2]), createdTime };
  }
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: now.getMonth() + 1,
    createdTime,
  };
}

export function resolveTouchKind(typeLabel: string): TouchKind {
  const normalized = typeLabel.trim().toLowerCase();
  if (normalized.includes('звон')) {
    return 'calls';
  }
  if (normalized.includes('письм') || normalized.includes('email') || normalized.includes('почт')) {
    return 'emails';
  }
  if (normalized.includes('встреч')) {
    return 'meetings';
  }
  return 'other';
}

function buildTypeLabelMap(field?: NamedCrmField | null): Map<string, string> {
  const labelMap = new Map<string, string>();
  const items = field?.items ?? field?.LIST;
  if (!items) {
    return labelMap;
  }

  const list = Array.isArray(items) ? items : Object.values(items);
  list.forEach((item) => {
    const id = String(item.ID ?? item.id ?? '');
    const value = String(item.VALUE ?? item.value ?? id);
    if (id) {
      labelMap.set(id, value);
    }
    labelMap.set(value, value);
  });

  return labelMap;
}

async function loadTouchTypeMeta(): Promise<NamedCrmField> {
  try {
    const raw = await callBxMethod<unknown>('crm.item.fields', {
      entityTypeId: TOUCHES_ENTITY_TYPE_ID,
    });
    const fields = unwrapFieldsResponse<Record<string, NamedCrmField>>(raw);
    const field = fields[TOUCH_TYPE_FIELD_CAMEL]
      ?? fields[TOUCH_TYPE_FIELD]
      ?? fields[TOUCH_TYPE_FIELD.toLowerCase()];

    if (field) {
      return {
        ...TOUCH_TYPE_FIELD_META,
        ...field,
        fieldName: field.fieldName ?? TOUCH_TYPE_FIELD_CAMEL,
        upperName: field.upperName ?? TOUCH_TYPE_FIELD,
      };
    }
  } catch (error) {
    console.warn('Не удалось загрузить поля касаний:', error);
  }

  return TOUCH_TYPE_FIELD_META;
}

export async function loadTouchTypeOptions(): Promise<TouchTypeOption[]> {
  const typeMeta = await loadTouchTypeMeta();
  const labelMap = buildTypeLabelMap(typeMeta);
  const options: TouchTypeOption[] = [];

  labelMap.forEach((title, id) => {
    if (!/^\d+$/.test(id) || options.some((option) => option.id === id)) {
      return;
    }
    options.push({
      id,
      title,
      kind: resolveTouchKind(title),
    });
  });

  return options.sort((left, right) => left.title.localeCompare(right.title, 'ru'));
}

export function buildTouchCreateFields(params: {
  contactId: string;
  typeId: string;
  comment: string;
  date: string;
  partnerName?: string;
}): Record<string, unknown> {
  const comment = params.comment.trim();
  const title = comment
    || [params.partnerName, 'Касание'].filter(Boolean).join(' — ')
    || 'Касание';

  return {
    title,
    contactId: Number(params.contactId) || params.contactId,
    [TOUCH_TYPE_FIELD_CAMEL]: Number(params.typeId) || params.typeId,
    [TOUCH_COMMENT_FIELD]: comment,
    [TOUCH_DATE_FIELD]: params.date,
  };
}

export async function createTouchItem(params: {
  contactId: string;
  typeId: string;
  comment: string;
  date: string;
  partnerName?: string;
}): Promise<MonthlyTouchItem> {
  if (!params.contactId) {
    throw new Error('Не указан партнёр для касания');
  }
  if (!params.typeId) {
    throw new Error('Не указан вид касания');
  }
  if (!params.date) {
    throw new Error('Не указана дата касания');
  }
  if (!params.comment.trim()) {
    throw new Error('Не указан комментарий к касанию');
  }

  const fields = buildTouchCreateFields(params);
  const raw = await callBxMethod<{ item?: Record<string, unknown>; id?: string | number }>(
    'crm.item.add',
    {
      entityTypeId: TOUCHES_ENTITY_TYPE_ID,
      fields,
    },
  );

  const item = (raw?.item ?? raw) as Record<string, unknown>;
  const typeMeta = await loadTouchTypeMeta();
  const typeLabelMap = buildTypeLabelMap(typeMeta);
  const mapped = mapTouchItem(
    {
      ...item,
      title: item?.title ?? fields.title,
      contactId: item?.contactId ?? fields.contactId,
      [TOUCH_TYPE_FIELD_CAMEL]: item?.[TOUCH_TYPE_FIELD_CAMEL] ?? params.typeId,
      createdTime: item?.createdTime
        ?? `${params.date}T12:00:00`,
    },
    typeLabelMap,
    typeMeta,
  );

  if (!mapped) {
    throw new Error('Не удалось создать касание');
  }

  return mapped;
}

export function mapTouchItem(
  item: Record<string, unknown>,
  typeLabelMap: Map<string, string>,
  typeMeta: NamedCrmField | null = TOUCH_TYPE_FIELD_META,
): MonthlyTouchItem | null {
  const id = firstScalar(item.id ?? item.ID);
  if (!id) {
    return null;
  }

  const typeId = firstScalar(
    getRecordFieldValue(item, TOUCH_TYPE_FIELD, typeMeta)
      ?? item[TOUCH_TYPE_FIELD_CAMEL]
      ?? item[TOUCH_TYPE_FIELD],
  );
  const typeLabel = typeLabelMap.get(typeId) ?? typeId;
  const communicationDate = firstScalar(
    item[TOUCH_DATE_FIELD]
      ?? item[TOUCH_DATE_FIELD_UPPER]
      ?? item[TOUCH_DATE_FIELD.toLowerCase()],
  );
  const { month, year, createdTime } = parseDateParts(
    communicationDate
      || item.createdTime
      || item.CREATED_TIME
      || item.created_time,
  );

  return {
    id,
    title: String(
      firstScalar(item[TOUCH_COMMENT_FIELD] ?? item[TOUCH_COMMENT_FIELD_UPPER])
        || item.title
        || item.TITLE
        || `Касание #${id}`,
    ),
    typeId,
    typeLabel,
    kind: resolveTouchKind(typeLabel),
    createdTime: communicationDate
      ? (communicationDate.includes('T') ? communicationDate : `${communicationDate}T12:00:00`)
      : createdTime,
    month,
    year,
    contactId: firstScalar(item.contactId ?? item.CONTACT_ID),
  };
}

export async function loadTouchesByContactIds(
  contactIds: string[],
): Promise<Map<string, MonthlyTouchItem[]>> {
  const result = new Map<string, MonthlyTouchItem[]>();
  const uniqueIds = [...new Set(contactIds.map(String).filter(Boolean))];
  if (!uniqueIds.length) {
    return result;
  }

  const typeMeta = await loadTouchTypeMeta();
  const typeLabelMap = buildTypeLabelMap(typeMeta);

  const filter = uniqueIds.length === 1
    ? { contactId: Number(uniqueIds[0]) || uniqueIds[0] }
    : { '@contactId': uniqueIds.map((id) => Number(id) || id) };

  const items = await fetchAllCrmItems(
    TOUCHES_ENTITY_TYPE_ID,
    [
      'id',
      'title',
      'contactId',
      TOUCH_TYPE_FIELD_CAMEL,
      TOUCH_TYPE_FIELD,
      TOUCH_COMMENT_FIELD,
      TOUCH_DATE_FIELD,
      'createdTime',
    ],
    filter,
  );

  items.forEach((item) => {
    const touch = mapTouchItem(item, typeLabelMap, typeMeta);
    if (!touch?.contactId) {
      return;
    }
    const list = result.get(touch.contactId) ?? [];
    list.push(touch);
    result.set(touch.contactId, list);
  });

  result.forEach((list, contactId) => {
    list.sort((left, right) => right.createdTime.localeCompare(left.createdTime));
    result.set(contactId, list);
  });

  return result;
}

export function filterTouches(
  touches: MonthlyTouchItem[],
  params: {
    kind?: TouchKind | null;
    months?: number[];
    years?: string[];
    search?: string;
  } = {},
): MonthlyTouchItem[] {
  const search = (params.search ?? '').trim().toLowerCase();
  const months = params.months ?? [];
  const years = params.years ?? [];

  return touches.filter((touch) => {
    if (params.kind && params.kind !== 'other' && touch.kind !== params.kind) {
      return false;
    }
    if (months.length && !months.includes(touch.month)) {
      return false;
    }
    if (years.length && !years.includes(touch.year)) {
      return false;
    }
    if (search) {
      const haystack = `${touch.title} ${touch.typeLabel}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

/** Если месяц/год не выбраны — берём текущий календарный месяц. */
export function resolveTouchesPeriod(
  months: number[] = [],
  years: string[] = [],
  now: Date = new Date(),
): { months: number[]; years: string[] } {
  if (months.length || years.length) {
    return {
      months: [...months],
      years: [...years],
    };
  }

  return {
    months: [now.getMonth() + 1],
    years: [String(now.getFullYear())],
  };
}

export function countTouchesByKind(
  touches: MonthlyTouchItem[],
  kind: TouchKind,
  months: number[] = [],
  years: string[] = [],
): number {
  const period = resolveTouchesPeriod(months, years);
  return filterTouches(touches, {
    kind,
    months: period.months,
    years: period.years,
  }).length;
}

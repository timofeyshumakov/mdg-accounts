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

const TOUCH_TYPE_FIELD_META: NamedCrmField = {
  title: 'Вид',
  fieldName: TOUCH_TYPE_FIELD_CAMEL,
  upperName: TOUCH_TYPE_FIELD,
  type: 'enumeration',
};

export function buildTouchDetailsPath(touchId: string | number): string {
  return `/crm/type/${TOUCHES_ENTITY_TYPE_ID}/details/${touchId}/`;
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
  const { month, year, createdTime } = parseDateParts(
    item.createdTime ?? item.CREATED_TIME ?? item.created_time,
  );

  return {
    id,
    title: String(item.title ?? item.TITLE ?? `Касание #${id}`),
    typeId,
    typeLabel,
    kind: resolveTouchKind(typeLabel),
    createdTime,
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
    ['id', 'title', 'contactId', TOUCH_TYPE_FIELD_CAMEL, TOUCH_TYPE_FIELD, 'createdTime'],
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

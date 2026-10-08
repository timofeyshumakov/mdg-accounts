import { callBxMethod, fetchAllCrmItems } from './bitrixApi';
import { extractScalarValues } from './bitrixFields';
import { appendCrmContactListFilter } from './bitrixListFilter';
import {
  filterTouches,
  TOUCHES_ENTITY_TYPE_ID,
} from './monthlyTouches';
import type { MonthlyReportRow, MonthlyTouchItem } from '../mock/monthlyReportData';

/** Смарт-процесс ежемесячной отчётности. */
export const MONTHLY_REPORT_SPA_ENTITY_TYPE_ID = 1258;

export const MONTHLY_REPORT_SPA_FIELDS = {
  touches: 'ufCrm140_1787237922',
  comment: 'ufCrm140_1787237987958',
  nextStep: 'ufCrm140_1787238005509',
  reportDate: 'ufCrm140_1787238020861',
  reportDateUpper: 'UF_CRM_140_1787238020861',
  currentStatus: 'ufCrm140_1787238112663',
  events: 'ufCrm140_1790349186',
  agreement: 'ufCrm140_1790349225',
  /** camelCase — как ожидает crm.item.* без useOriginalUfNames */
  source: 'ufCrm140_1790349250',
  interest: 'ufCrm140_1790349266',
  newPartnerCurrentStatus: 'ufCrm140_1790349233',
} as const;

/** Contact entityTypeId в CRM Bitrix — parentId3. */
export const BITRIX_CONTACT_ENTITY_TYPE_ID = 3;

function toPositiveId(value: unknown): number | null {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return null;
}

function toCrmEntityIds(values: unknown[]): Array<number | string> {
  return values
    .map((value) => {
      const numeric = toPositiveId(value);
      if (numeric != null) {
        return numeric;
      }
      const text = String(value ?? '').trim();
      return text || null;
    })
    .filter((value): value is number | string => value != null && value !== '');
}

export function resolveMonthlyReportContactId(
  row: Pick<MonthlyReportRow, 'id'>,
): number | string {
  const numeric = toPositiveId(row.id);
  if (numeric != null) {
    return numeric;
  }
  return String(row.id ?? '').trim();
}

export interface MonthlyReportPeriod {
  month: number;
  year: string;
}

export function getCurrentReportPeriod(now: Date = new Date()): MonthlyReportPeriod {
  return {
    month: now.getMonth() + 1,
    year: String(now.getFullYear()),
  };
}

export function resolveReportPeriod(
  selectedMonths: number[],
  selectedYears: string[],
  now: Date = new Date(),
): MonthlyReportPeriod {
  const current = getCurrentReportPeriod(now);

  if (selectedMonths.length === 1 && selectedYears.length === 1) {
    return {
      month: selectedMonths[0],
      year: selectedYears[0],
    };
  }

  if (selectedMonths.length === 1 && selectedYears.length === 0) {
    return {
      month: selectedMonths[0],
      year: current.year,
    };
  }

  return current;
}

/** Дата периода (1-е число месяца) — ключ отчёта в SPA и фильтры. */
export function formatReportPeriodDate(period: MonthlyReportPeriod): string {
  return `${period.year}-${String(period.month).padStart(2, '0')}-01`;
}

export function formatReportPeriodEndDate(period: MonthlyReportPeriod): string {
  const lastDay = new Date(Number(period.year), period.month, 0).getDate();
  return `${period.year}-${String(period.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** Дата в поле отчёта — текущий календарный день. */
export function formatReportCreatedDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildReportDateRangeFilter(
  field: string,
  period: MonthlyReportPeriod,
): Record<string, unknown> {
  return {
    [`>=${field}`]: `${formatReportPeriodDate(period)}T00:00:00`,
    [`<=${field}`]: `${formatReportPeriodEndDate(period)}T23:59:59`,
  };
}

export function formatReportPeriodLabel(period: MonthlyReportPeriod): string {
  return `${String(period.month).padStart(2, '0')}.${period.year}`;
}

export function getPeriodTouches(
  touches: MonthlyTouchItem[],
  period: MonthlyReportPeriod,
): MonthlyTouchItem[] {
  return filterTouches(touches, {
    months: [period.month],
    years: [period.year],
  });
}

export function buildMonthlyReportSpaTitle(
  row: MonthlyReportRow,
  period: MonthlyReportPeriod,
): string {
  const partner = [row.partnerName, row.organization].filter(Boolean).join(', ');
  return `${partner} — ${formatReportPeriodLabel(period)}`;
}

export function buildMonthlyReportSpaFields(
  row: MonthlyReportRow,
  period: MonthlyReportPeriod,
): Record<string, unknown> {
  const periodTouches = getPeriodTouches(row.touches ?? [], period);

  const periodEventIds = toCrmEntityIds(
    (row.events ?? [])
      .filter((event) => {
        const eventDate = new Date(event.startDate);
        return eventDate.getMonth() + 1 === period.month
          && String(eventDate.getFullYear()) === period.year;
      })
      .map((event) => {
        const rawId = event.id;
        if (Array.isArray(rawId) && rawId.length > 0) {
          return rawId[0];
        }
        if (rawId && typeof rawId === 'object' && 'id' in rawId) {
          return (rawId as Record<string, unknown>).id;
        }
        if (rawId && typeof rawId === 'object' && 'ID' in rawId) {
          return (rawId as Record<string, unknown>).ID;
        }
        return rawId;
      }),
  );

  const contactId = resolveMonthlyReportContactId(row);
  if (!contactId) {
    throw new Error('Не указан партнёр (контакт) для отчёта');
  }

  const touchIds = toCrmEntityIds(periodTouches.map((touch) => touch.id));
  const isNewPartner = row.partnerTypeId === 'new';

  // contactId + contactIds — стандартная клиентская привязка SPA;
  // parentId3 — связь с Contact (entityTypeId=3), если в типе включены parent-связи.
  const fields: Record<string, unknown> = {
    title: buildMonthlyReportSpaTitle(row, period),
    contactId,
    contactIds: [contactId],
    [`parentId${BITRIX_CONTACT_ENTITY_TYPE_ID}`]: contactId,
    [MONTHLY_REPORT_SPA_FIELDS.touches]: touchIds,
    [MONTHLY_REPORT_SPA_FIELDS.events]: periodEventIds,
    [MONTHLY_REPORT_SPA_FIELDS.comment]: row.comment ?? '',
    [MONTHLY_REPORT_SPA_FIELDS.nextStep]: row.nextStep ?? '',
    [MONTHLY_REPORT_SPA_FIELDS.reportDate]: formatReportCreatedDate(),
    [MONTHLY_REPORT_SPA_FIELDS.currentStatus]: row.currentStatus ?? '',
  };

  if (isNewPartner) {
    const agreementId = toPositiveId(row.agreementId) ?? String(row.agreementId ?? '').trim();
    if (agreementId) {
      fields[MONTHLY_REPORT_SPA_FIELDS.agreement] = agreementId;
    }
    if (row.agreementInfo?.source) {
      fields[MONTHLY_REPORT_SPA_FIELDS.source] = row.agreementInfo.source;
    }
    if (row.agreementInfo?.interest || row.interest) {
      fields[MONTHLY_REPORT_SPA_FIELDS.interest] = row.agreementInfo?.interest || row.interest;
    }
    if (row.agreementInfo?.currentStatus) {
      fields[MONTHLY_REPORT_SPA_FIELDS.newPartnerCurrentStatus] = row.agreementInfo.currentStatus;
    }
  }

  const assignedId = toPositiveId(row.assignedId);
  if (assignedId != null) {
    fields.assignedById = assignedId;
  }

  const companyId = toPositiveId(row.companyId);
  if (companyId != null) {
    fields.companyId = companyId;
  }

  return fields;
}

export function pickDefaultCategoryId(
  categories: Array<{ id?: unknown; isDefault?: unknown; sort?: unknown }>,
): number | null {
  if (!categories.length) {
    return null;
  }

  const defaultCategory = categories.find((category) => (
    category.isDefault === 'Y' || category.isDefault === true
  )) ?? [...categories].sort((left, right) => Number(left.sort ?? 0) - Number(right.sort ?? 0))[0];

  const id = Number(defaultCategory?.id);
  return Number.isFinite(id) ? id : null;
}

let cachedMonthlyReportCategoryId: number | null | undefined;

export async function resolveMonthlyReportCategoryId(): Promise<number | null> {
  if (cachedMonthlyReportCategoryId !== undefined) {
    return cachedMonthlyReportCategoryId;
  }

  try {
    const raw = await callBxMethod<
      Array<{ id?: unknown; isDefault?: unknown; sort?: unknown }>
      | { categories?: Array<{ id?: unknown; isDefault?: unknown; sort?: unknown }> }
    >(
      'crm.category.list',
      { entityTypeId: MONTHLY_REPORT_SPA_ENTITY_TYPE_ID },
    );
    const categories = Array.isArray(raw) ? raw : (raw?.categories ?? []);
    cachedMonthlyReportCategoryId = pickDefaultCategoryId(categories);
  } catch (error) {
    console.warn('Не удалось загрузить воронку отчётности:', error);
    cachedMonthlyReportCategoryId = null;
  }

  return cachedMonthlyReportCategoryId;
}

function buildContactBindingFields(contactId: number | string): Record<string, unknown> {
  return {
    contactId,
    contactIds: [contactId],
    [`parentId${BITRIX_CONTACT_ENTITY_TYPE_ID}`]: contactId,
  };
}

/** Если после add контакт пустой — дописываем привязку через update. */
export async function ensureMonthlyReportContactBinding(
  itemId: string | number,
  contactId: number | string,
): Promise<void> {
  const id = String(itemId ?? '').trim();
  const expected = String(contactId ?? '').trim();
  if (!id || !expected) {
    return;
  }

  try {
    const raw = await callBxMethod<{ item?: Record<string, unknown> } | Record<string, unknown>>(
      'crm.item.get',
      {
        entityTypeId: MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
        id,
      },
    );
    const item = ((raw as { item?: Record<string, unknown> })?.item ?? raw) as Record<string, unknown>;
    const bound = extractContactIdFromSpaItem(item);
    if (bound && bound === expected) {
      return;
    }

    await callBxMethod('crm.item.update', {
      entityTypeId: MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
      id,
      fields: buildContactBindingFields(toPositiveId(contactId) ?? contactId),
    });
  } catch (error) {
    console.warn('Не удалось проверить/дописать привязку отчёта к контакту:', error);
  }
}

export function buildMonthlyReportSpaDetailsPath(itemId: string | number): string {
  return `/crm/type/${MONTHLY_REPORT_SPA_ENTITY_TYPE_ID}/details/${itemId}/`;
}

export function buildMonthlyReportSpaListPath(
  contactId: string,
  contactLabel?: string,
): string {
  const params = new URLSearchParams();
  appendCrmContactListFilter(params, 'CONTACT_ID', contactId, contactLabel);
  return `/crm/type/${MONTHLY_REPORT_SPA_ENTITY_TYPE_ID}/list/category/0/?${params.toString()}`;
}

function extractContactIdFromSpaItem(item: Record<string, unknown>): string {
  const raw = item.contactId ?? item.CONTACT_ID ?? item.contact_id;
  if (Array.isArray(raw)) {
    return String(raw[0] ?? '').trim();
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    return String(record.id ?? record.ID ?? '').trim();
  }
  return String(raw ?? '').trim();
}

function extractReportDateFromSpaItem(item: Record<string, unknown>): string {
  const raw = item[MONTHLY_REPORT_SPA_FIELDS.reportDate]
    ?? item[MONTHLY_REPORT_SPA_FIELDS.reportDateUpper]
    ?? item.reportDate
    ?? '';
  return String(raw).slice(0, 10);
}

export function spaItemMatchesReportPeriod(
  item: Record<string, unknown>,
  period: MonthlyReportPeriod,
): boolean {
  const reportDate = extractReportDateFromSpaItem(item);
  return reportDate === formatReportPeriodDate(period)
    || reportDate.startsWith(`${period.year}-${String(period.month).padStart(2, '0')}`);
}

/** Контакты, у которых есть SPA-отчёт за период (по умолчанию текущий месяц). */
export async function loadContactIdsWithReportForPeriod(
  period: MonthlyReportPeriod,
): Promise<Set<string>> {
  const select = [
    'id',
    'contactId',
    'CONTACT_ID',
    MONTHLY_REPORT_SPA_FIELDS.reportDate,
    MONTHLY_REPORT_SPA_FIELDS.reportDateUpper,
  ];

  const items = await fetchSpaItemsForPeriod(select, period);
  const contactIds = new Set<string>();
  items.forEach((item) => {
    const contactId = extractContactIdFromSpaItem(item);
    if (contactId) {
      contactIds.add(contactId);
    }
  });

  return contactIds;
}

export async function createMonthlyReportSpaItem(
  row: MonthlyReportRow,
  period: MonthlyReportPeriod,
): Promise<{ id: string }> {
  const fields = buildMonthlyReportSpaFields(row, period);
  const contactId = fields.contactId as number | string;
  const categoryId = await resolveMonthlyReportCategoryId();
  if (categoryId != null) {
    fields.categoryId = categoryId;
  }

  const raw = await callBxMethod<{ item?: { id?: string | number }; id?: string | number }>(
    'crm.item.add',
    {
      entityTypeId: MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
      fields,
    },
  );

  const id = String(raw?.item?.id ?? raw?.id ?? '');
  if (!id) {
    throw new Error('Не удалось создать элемент отчётности');
  }

  await ensureMonthlyReportContactBinding(id, contactId);

  return { id };
}

export type SpaReportTexts = {
  comment: string;
  nextStep: string;
};

function spaFieldVariants(field: string): string[] {
  return [
    field,
    field.replace('ufCrm', 'UF_CRM_'),
    field.replace('UF_CRM_', 'ufCrm'),
  ];
}

function readSpaTextField(item: Record<string, unknown>, field: string): string {
  for (const key of spaFieldVariants(field)) {
    const value = firstScalar(item[key]);
    if (value) {
      return value;
    }
  }
  return '';
}

async function fetchSpaItemsForPeriod(
  select: string[],
  period: MonthlyReportPeriod,
): Promise<Record<string, unknown>[]> {
  let items: Record<string, unknown>[] = [];

  try {
    items = await fetchAllCrmItems(
      MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
      select,
      buildReportDateRangeFilter(MONTHLY_REPORT_SPA_FIELDS.reportDate, period),
    );
  } catch {
    items = [];
  }

  if (!items.length) {
    try {
      items = await fetchAllCrmItems(
        MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
        select,
        buildReportDateRangeFilter(MONTHLY_REPORT_SPA_FIELDS.reportDateUpper, period),
      );
    } catch {
      items = [];
    }
  }

  if (!items.length) {
    try {
      items = await fetchAllCrmItems(MONTHLY_REPORT_SPA_ENTITY_TYPE_ID, select, {});
    } catch {
      items = [];
    }
  }

  return items.filter((item) => spaItemMatchesReportPeriod(item, period));
}

/** Загрузка комментария и следующего шага из SPA-отчётов за период. */
export async function loadSpaTextsForContacts(
  contactIds: string[],
  period: MonthlyReportPeriod,
): Promise<Map<string, SpaReportTexts>> {
  const textMap = new Map<string, SpaReportTexts>();
  const contactSet = new Set(contactIds.map(String).filter(Boolean));

  if (!contactSet.size) {
    return textMap;
  }

  const select = [
    'id',
    'contactId',
    'CONTACT_ID',
    MONTHLY_REPORT_SPA_FIELDS.comment,
    MONTHLY_REPORT_SPA_FIELDS.nextStep,
    MONTHLY_REPORT_SPA_FIELDS.reportDate,
    MONTHLY_REPORT_SPA_FIELDS.reportDateUpper,
  ];

  try {
    const items = await fetchSpaItemsForPeriod(select, period);
    const latestByContact = new Map<string, { date: string; id: number }>();

    items.forEach((item) => {
      const contactId = extractContactIdFromSpaItem(item);
      if (!contactId || !contactSet.has(contactId)) {
        return;
      }

      const date = extractReportDateFromSpaItem(item);
      const id = Number(item.id ?? item.ID ?? 0) || 0;
      const prev = latestByContact.get(contactId);
      if (prev && (prev.date > date || (prev.date === date && prev.id >= id))) {
        return;
      }

      latestByContact.set(contactId, { date, id });
      textMap.set(contactId, {
        comment: readSpaTextField(item, MONTHLY_REPORT_SPA_FIELDS.comment),
        nextStep: readSpaTextField(item, MONTHLY_REPORT_SPA_FIELDS.nextStep),
      });
    });
  } catch (error) {
    console.warn('Не удалось загрузить тексты из SPA-отчетов:', error);
  }

  return textMap;
}

/** @deprecated используйте loadSpaTextsForContacts */
export async function loadSpaCommentsForContacts(
  contactIds: string[],
  period: MonthlyReportPeriod,
): Promise<Map<string, string>> {
  const texts = await loadSpaTextsForContacts(contactIds, period);
  const commentMap = new Map<string, string>();
  texts.forEach((value, contactId) => {
    if (value.comment) {
      commentMap.set(contactId, value.comment);
    }
  });
  return commentMap;
}

function firstScalar(value: unknown): string {
  const values = extractScalarValues(value);
  return values[0] ? String(values[0]) : '';
}

export { TOUCHES_ENTITY_TYPE_ID };

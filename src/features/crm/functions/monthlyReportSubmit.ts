import { callBxMethod, fetchAllCrmItems } from './bitrixApi';
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
} as const;

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

export function formatReportPeriodDate(period: MonthlyReportPeriod): string {
  return `${period.year}-${String(period.month).padStart(2, '0')}-01`;
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
  const fields: Record<string, unknown> = {
    title: buildMonthlyReportSpaTitle(row, period),
    contactId: Number(row.id) || row.id,
    [MONTHLY_REPORT_SPA_FIELDS.touches]: periodTouches.map((touch) => touch.id),
    [MONTHLY_REPORT_SPA_FIELDS.comment]: row.comment ?? '',
    [MONTHLY_REPORT_SPA_FIELDS.nextStep]: row.nextStep ?? '',
    [MONTHLY_REPORT_SPA_FIELDS.reportDate]: formatReportPeriodDate(period),
    [MONTHLY_REPORT_SPA_FIELDS.currentStatus]: row.currentStatus ?? '',
  };

  if (row.assignedId) {
    fields.assignedById = Number(row.assignedId) || row.assignedId;
  }

  if (row.companyId) {
    fields.companyId = Number(row.companyId) || row.companyId;
  }

  return fields;
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
  const reportDate = formatReportPeriodDate(period);
  const select = [
    'id',
    'contactId',
    'CONTACT_ID',
    MONTHLY_REPORT_SPA_FIELDS.reportDate,
    MONTHLY_REPORT_SPA_FIELDS.reportDateUpper,
  ];

  let items: Record<string, unknown>[] = [];
  try {
    items = await fetchAllCrmItems(
      MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
      select,
      { [MONTHLY_REPORT_SPA_FIELDS.reportDate]: reportDate },
    );
  } catch {
    items = [];
  }

  if (!items.length) {
    try {
      items = await fetchAllCrmItems(
        MONTHLY_REPORT_SPA_ENTITY_TYPE_ID,
        select,
        { [MONTHLY_REPORT_SPA_FIELDS.reportDateUpper]: reportDate },
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

  const contactIds = new Set<string>();
  items.forEach((item) => {
    if (!spaItemMatchesReportPeriod(item, period)) {
      return;
    }
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

  return { id };
}

export { TOUCHES_ENTITY_TYPE_ID };

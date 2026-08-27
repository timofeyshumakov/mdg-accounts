import { MONTH_OPTIONS, buildYearOptions, type FilterOption } from '../functions/crmFilters';

export interface MonthlyChipOption {
  id: string;
  label: string;
  count: number;
}

export type TouchKind = 'calls' | 'emails' | 'meetings' | 'other';

export interface MonthlyTouchItem {
  id: string;
  title: string;
  typeId: string;
  typeLabel: string;
  kind: TouchKind;
  createdTime: string;
  month: number;
  year: string;
  contactId: string;
}

export interface MonthlyReportRow {
  id: string;
  partnerName: string;
  organization: string;
  nosologies: string;
  nosologyIds: string[];
  relationStatus: string;
  relationStatusId: string;
  interest: string;
  agreementLink: string;
  ourEventsLink: string;
  competitorEventsLink: string;
  calls: number;
  emails: number;
  meetings: number;
  touches: MonthlyTouchItem[];
  currentStatus: string;
  currentStatusId: string;
  comment: string;
  nextStep: string;
  tasks: number;
  taskIds: string[];
  taskItems: Array<{ id: string; title: string; contactId: string }>;
  tasksLink: string;
  companyId: string;
  partnerTypeId: 'active' | 'new' | '';
  assignedId: string;
  month: number;
  year: string;
}

export const monthlyMonthOptions = MONTH_OPTIONS;
export const monthlyYearOptions: FilterOption[] = buildYearOptions();

export function hasNextStep(row: MonthlyReportRow): boolean {
  return Boolean(row.nextStep?.trim());
}

export function hasTouchesInPeriod(
  row: MonthlyReportRow,
  months: number[] = [],
  years: string[] = [],
): boolean {
  const touches = row.touches ?? [];
  if (!touches.length) {
    return false;
  }

  const effectiveMonths = [...months];
  const effectiveYears = [...years];

  if (!effectiveMonths.length && !effectiveYears.length) {
    const now = new Date();
    effectiveMonths.push(now.getMonth() + 1);
    effectiveYears.push(String(now.getFullYear()));
  }

  return touches.some((touch) => {
    if (effectiveMonths.length && !effectiveMonths.includes(touch.month)) {
      return false;
    }
    if (effectiveYears.length && !effectiveYears.includes(touch.year)) {
      return false;
    }
    return true;
  });
}

export function filterMonthlyReportRows(
  rows: MonthlyReportRow[],
  params: {
    search: string;
    assignedIds: string[];
    months: number[];
    years: string[];
    partnerTypes: string[];
    relationStatuses: string[];
    currentStatuses: string[];
    onlyNoTouches?: boolean;
    onlyNoNextStep?: boolean;
  },
): MonthlyReportRow[] {
  const search = params.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (params.assignedIds.length && !params.assignedIds.includes(row.assignedId)) {
      return false;
    }
    if (params.months.length && !params.months.includes(row.month)) {
      return false;
    }
    if (params.years.length && !params.years.includes(row.year)) {
      return false;
    }
    if (params.partnerTypes.length && !params.partnerTypes.includes(row.partnerTypeId)) {
      return false;
    }
    if (params.relationStatuses.length && !params.relationStatuses.includes(row.relationStatusId)) {
      return false;
    }
    if (params.currentStatuses.length && !params.currentStatuses.includes(row.currentStatusId)) {
      return false;
    }
    if (params.onlyNoTouches && hasTouchesInPeriod(row, params.months, params.years)) {
      return false;
    }
    if (params.onlyNoNextStep && hasNextStep(row)) {
      return false;
    }
    if (search) {
      const haystack = `${row.partnerName} ${row.organization}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

export function recountChips(
  rows: MonthlyReportRow[],
  chips: MonthlyChipOption[],
  field: 'partnerTypeId' | 'relationStatusId' | 'currentStatusId',
): MonthlyChipOption[] {
  return chips.map((chip) => ({
    ...chip,
    count: rows.filter((row) => row[field] === chip.id).length,
  }));
}

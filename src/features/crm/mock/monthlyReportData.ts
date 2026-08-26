import { MONTH_OPTIONS, buildYearOptions, type FilterOption } from '../functions/crmFilters';

export interface MonthlyChipOption {
  id: string;
  label: string;
  count: number;
}

export interface MonthlyReportRow {
  id: string;
  partnerName: string;
  organization: string;
  nosologies: string;
  relationStatus: string;
  relationStatusId: string;
  interest: string;
  agreementLink: string;
  ourEventsLink: string;
  competitorEventsLink: string;
  calls: number;
  emails: number;
  meetings: number;
  currentStatus: string;
  currentStatusId: string;
  comment: string;
  nextStep: string;
  tasks: number;
  partnerTypeId: 'active' | 'new';
  assignedId: string;
  month: number;
  year: string;
}

export const monthlyMonthOptions = MONTH_OPTIONS;
export const monthlyYearOptions: FilterOption[] = buildYearOptions();

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

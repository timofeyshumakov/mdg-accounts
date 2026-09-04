import { callBxMethod, fetchAllCrmItems, fetchAllPages } from './bitrixApi';
import { extractEntityIds } from './bitrixFields';
import {
  buildPartnersContactFilter,
  getPartnerTypeIds,
} from './partnersDirectory';
import {
  EVENT_PARTNER_FIELD,
  EVENT_PARTNER_FIELD_META,
  formatContactName,
  getEventPartnerValue,
} from './partnersPotentialChart';
import { getOurEventsEntityTypeId } from './ourEventsMetric';
import {
  extractCrmTypes,
  findCompetitorEventsEntityTypeId,
} from './competitorEventsMetric';

/** Дата начала мероприятия (как в detail-report). */
export const EVENT_START_DATE_FIELD = 'ufCrm38_1745307580193';
export const EVENT_START_DATE_FIELD_UPPER = 'UF_CRM_38_1745307580193';

export const EVENT_ASSIGNED_FIELD = 'assignedById';
export const EVENT_ASSIGNED_FIELD_UPPER = 'ASSIGNED_BY_ID';

export interface FilterOption {
  id: string;
  title: string;
}

export interface CrmDashboardFilters {
  assignedIds: string[];
  partnerIds: string[];
  months: number[];
  years: string[];
}

export interface MonthOption {
  id: number;
  title: string;
}

export const MONTH_OPTIONS: MonthOption[] = [
  { id: 1, title: 'Январь' },
  { id: 2, title: 'Февраль' },
  { id: 3, title: 'Март' },
  { id: 4, title: 'Апрель' },
  { id: 5, title: 'Май' },
  { id: 6, title: 'Июнь' },
  { id: 7, title: 'Июль' },
  { id: 8, title: 'Август' },
  { id: 9, title: 'Сентябрь' },
  { id: 10, title: 'Октябрь' },
  { id: 11, title: 'Ноябрь' },
  { id: 12, title: 'Декабрь' },
];

export function createEmptyFilters(): CrmDashboardFilters {
  return {
    assignedIds: [],
    partnerIds: [],
    months: [],
    years: [],
  };
}

export function buildYearOptions(currentYear = new Date().getFullYear()): FilterOption[] {
  const years: FilterOption[] = [];
  for (let year = currentYear + 1; year >= currentYear - 10; year -= 1) {
    years.push({ id: String(year), title: String(year) });
  }
  return years;
}

/** Диапазоны [from, to] YYYY-MM-DD по выбранным месяцам и годам. */
export function buildMonthYearDateRanges(
  months: number[],
  years: Array<string | number>,
): Array<{ from: string; to: string }> {
  if (!months.length && !years.length) {
    return [];
  }

  const monthList = months.length
    ? [...new Set(months.filter((month) => month >= 1 && month <= 12))].sort((a, b) => a - b)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const yearList = years.length
    ? [...new Set(years.map(Number).filter((year) => Number.isFinite(year)))].sort((a, b) => a - b)
    : [new Date().getFullYear()];

  const ranges: Array<{ from: string; to: string }> = [];

  yearList.forEach((year) => {
    monthList.forEach((month) => {
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      ranges.push({ from, to });
    });
  });

  return ranges;
}

export function toCalendarDate(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/[+-]\d{2}:\d{2}$|Z$/i.test(raw)) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (raw.includes('T')) {
    return raw.split('T')[0];
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const ruMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (ruMatch) {
    return `${ruMatch[3]}-${ruMatch[2]}-${ruMatch[1]}`;
  }

  return null;
}

export function getEventStartDateValue(event: Record<string, unknown>): unknown {
  return event[EVENT_START_DATE_FIELD]
    ?? event[EVENT_START_DATE_FIELD_UPPER]
    ?? event.begindate
    ?? event.beginDate
    ?? event.BEGINDATE;
}

export function getEventAssignedValue(event: Record<string, unknown>): unknown {
  return event[EVENT_ASSIGNED_FIELD]
    ?? event[EVENT_ASSIGNED_FIELD_UPPER]
    ?? event.assignedById
    ?? event.ASSIGNED_BY_ID;
}

export function getContactAssignedValue(contact: Record<string, unknown>): unknown {
  return contact.ASSIGNED_BY_ID ?? contact.assignedById ?? contact.assigned_by_id;
}

export function matchesAssigned(
  assignedValue: unknown,
  selectedAssignedIds: string[],
): boolean {
  if (!selectedAssignedIds.length) {
    return true;
  }

  const ids = extractEntityIds(assignedValue);
  if (!ids.length && assignedValue != null && assignedValue !== '') {
    return selectedAssignedIds.map(String).includes(String(assignedValue));
  }

  const selected = new Set(selectedAssignedIds.map(String));
  return ids.some((id) => selected.has(String(id)));
}

export function matchesPartner(
  partnerValue: unknown,
  selectedPartnerIds: string[],
): boolean {
  if (!selectedPartnerIds.length) {
    return true;
  }

  const ids = extractEntityIds(partnerValue);
  if (!ids.length && partnerValue != null && partnerValue !== '') {
    return selectedPartnerIds.map(String).includes(String(partnerValue));
  }

  const selected = new Set(selectedPartnerIds.map(String));
  return ids.some((id) => selected.has(String(id)));
}

export function matchesEventDate(
  startDateValue: unknown,
  months: number[],
  years: Array<string | number>,
): boolean {
  if (!months.length && !years.length) {
    return true;
  }

  const date = toCalendarDate(startDateValue);
  if (!date) {
    return false;
  }

  const [yearStr, monthStr] = date.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const yearSet = new Set(years.map((item) => Number(item)));

  if (yearSet.size && !yearSet.has(year)) {
    return false;
  }

  if (months.length && !months.includes(month)) {
    return false;
  }

  return true;
}

export function eventPassesFilters(
  event: Record<string, unknown>,
  filters: CrmDashboardFilters,
  options: { partnerIdsByAssigned?: Set<string> | null } = {},
): boolean {
  const partnerValue = getEventPartnerValue(
    event,
    EVENT_PARTNER_FIELD,
    EVENT_PARTNER_FIELD_META,
  );

  if (!matchesPartner(partnerValue, filters.partnerIds)) {
    return false;
  }

  if (!matchesEventDate(getEventStartDateValue(event), filters.months, filters.years)) {
    return false;
  }

  if (!filters.assignedIds.length) {
    return true;
  }

  // Ответственный в фильтре = ответственный контакта-партнёра (отдел партнёров),
  // а не assignedById самого мероприятия.
  const partnerIdsByAssigned = options.partnerIdsByAssigned;
  if (partnerIdsByAssigned) {
    const eventPartnerIds = extractEntityIds(partnerValue);
    return eventPartnerIds.some((id) => partnerIdsByAssigned.has(String(id)));
  }

  return matchesAssigned(getEventAssignedValue(event), filters.assignedIds);
}

export function collectPartnerIdsByAssigned(
  contacts: Record<string, unknown>[],
  assignedIds: string[],
): Set<string> {
  const ids = new Set<string>();
  if (!assignedIds.length) {
    return ids;
  }

  contacts.forEach((contact) => {
    if (!matchesAssigned(getContactAssignedValue(contact), assignedIds)) {
      return;
    }
    const contactId = String(contact.ID ?? contact.id ?? '').trim();
    if (contactId) {
      ids.add(contactId);
    }
  });

  return ids;
}

export function contactPassesFilters(
  contact: Record<string, unknown>,
  filters: CrmDashboardFilters,
  partnerIdsFromEvents: Set<string> | null = null,
): boolean {
  const contactId = String(contact.ID ?? contact.id ?? '');

  if (filters.partnerIds.length && !filters.partnerIds.map(String).includes(contactId)) {
    return false;
  }

  if (!matchesAssigned(getContactAssignedValue(contact), filters.assignedIds)) {
    return false;
  }

  if (partnerIdsFromEvents && (filters.months.length || filters.years.length)) {
    return partnerIdsFromEvents.has(contactId);
  }

  return true;
}

export function collectPartnerIdsFromEvents(
  events: Record<string, unknown>[],
): Set<string> {
  const ids = new Set<string>();

  events.forEach((event) => {
    extractEntityIds(
      getEventPartnerValue(event, EVENT_PARTNER_FIELD, EVENT_PARTNER_FIELD_META),
    ).forEach((id) => ids.add(String(id)));
  });

  return ids;
}

interface BitrixUser {
  ID?: string | number;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
  ACTIVE?: boolean | string;
}

interface BitrixDepartment {
  ID?: string | number;
  NAME?: string;
  PARENT?: string | number;
}

/** Отдел для фильтра «Ответственный» в CRM / monthly report. */
export const PARTNERS_DEPARTMENT_NAME = 'Отдел по работе с партнерами';
/** ID отдела «Отдел по работе с партнерами» (department.get). */
export const PARTNERS_DEPARTMENT_ID = '566';

function formatUserName(user: BitrixUser): string {
  const parts = [user.LAST_NAME, user.NAME, user.SECOND_NAME]
    .filter(Boolean)
    .map(String);

  return parts.join(' ').trim() || `Пользователь #${user.ID}`;
}

export async function findDepartmentIdsByName(name: string): Promise<string[]> {
  const departments = await fetchAllPages<BitrixDepartment>('department.get', {});
  const needle = name.trim().toLowerCase();

  const root = departments.find((dept) => String(dept.NAME ?? '').trim().toLowerCase() === needle)
    ?? departments.find((dept) => String(dept.NAME ?? '').trim().toLowerCase().includes(needle));

  if (!root?.ID) {
    return [];
  }

  const rootId = String(root.ID);
  const ids = new Set<string>([rootId]);
  let grew = true;

  while (grew) {
    grew = false;
    departments.forEach((dept) => {
      const id = dept.ID != null ? String(dept.ID) : '';
      const parent = dept.PARENT != null ? String(dept.PARENT) : '';
      if (!id || !parent || ids.has(id) || !ids.has(parent)) {
        return;
      }
      ids.add(id);
      grew = true;
    });
  }

  return [...ids];
}

export async function loadAssignedUsers(): Promise<FilterOption[]> {
  let departmentIds: string[] = [PARTNERS_DEPARTMENT_ID];

  try {
    const resolved = await findDepartmentIdsByName(PARTNERS_DEPARTMENT_NAME);
    if (resolved.length) {
      departmentIds = resolved;
    }
  } catch (error) {
    console.warn(
      `Не удалось загрузить структуру отделов, используем ID ${PARTNERS_DEPARTMENT_ID}:`,
      error,
    );
  }

  if (!departmentIds.length) {
    console.warn(
      `Не найден отдел «${PARTNERS_DEPARTMENT_NAME}» — фильтр ответственных будет пустым`,
    );
    return [];
  }

  const usersById = new Map<string, FilterOption>();

  await Promise.all(
    departmentIds.map(async (departmentId) => {
      const users = await fetchAllPages<BitrixUser>('user.get', {
        FILTER: {
          UF_DEPARTMENT: departmentId,
          ACTIVE: true,
        },
      });

      users.forEach((user) => {
        const id = String(user.ID ?? '');
        if (!id || usersById.has(id)) {
          return;
        }
        usersById.set(id, {
          id,
          title: formatUserName(user),
        });
      });
    }),
  );

  return [...usersById.values()].sort((left, right) =>
    left.title.localeCompare(right.title, 'ru'),
  );
}

export async function loadPartnerOptions(): Promise<FilterOption[]> {
  const typeIds = await getPartnerTypeIds();
  const contacts = await fetchAllPages<Record<string, unknown>>('crm.contact.list', {
    filter: buildPartnersContactFilter(typeIds),
    select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME'],
  });

  return contacts
    .map((contact) => {
      const id = String(contact.ID ?? '');
      return {
        id,
        title: formatContactName({
          ID: id,
          NAME: contact.NAME as string | undefined,
          LAST_NAME: contact.LAST_NAME as string | undefined,
          SECOND_NAME: contact.SECOND_NAME as string | undefined,
        }),
      };
    })
    .filter((partner) => partner.id)
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
}

export function buildDashboardEventSelect(): string[] {
  return [
    'id',
    'title',
    EVENT_PARTNER_FIELD,
    'CONTACT_ID',
    EVENT_ASSIGNED_FIELD,
    EVENT_ASSIGNED_FIELD_UPPER,
    EVENT_START_DATE_FIELD,
    EVENT_START_DATE_FIELD_UPPER,
    'begindate',
    'UF_CRM_38_1750949359532',
    'ufCrm38_1750949359532',
  ];
}

async function fetchSpaEvents(entityTypeId: number): Promise<Record<string, unknown>[]> {
  const select = buildDashboardEventSelect();
  const attempts: Array<{ select?: string[]; useOriginalUfNames: 'Y' | 'N' }> = [
    { select, useOriginalUfNames: 'N' },
    { select, useOriginalUfNames: 'Y' },
    { useOriginalUfNames: 'N' },
    { useOriginalUfNames: 'Y' },
  ];

  for (const attempt of attempts) {
    const events = await fetchAllCrmItems(
      entityTypeId,
      attempt.select,
      {},
      { useOriginalUfNames: attempt.useOriginalUfNames },
    );

    if (events.length > 0) {
      return events;
    }
  }

  return [];
}

export async function loadOurEventsRaw(): Promise<Record<string, unknown>[]> {
  const entityTypeId = await getOurEventsEntityTypeId();
  return fetchSpaEvents(entityTypeId);
}

export async function loadCompetitorEventsRaw(): Promise<Record<string, unknown>[]> {
  const raw = await callBxMethod<{ types?: Array<{ entityTypeId: number; title: string }> } | Array<{ entityTypeId: number; title: string }>>(
    'crm.type.list',
    { order: { id: 'ASC' } },
  );
  const entityTypeId = findCompetitorEventsEntityTypeId(extractCrmTypes(raw));
  if (!entityTypeId) {
    return [];
  }

  return fetchSpaEvents(entityTypeId);
}

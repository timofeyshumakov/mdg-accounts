import { callApi } from '../../../functions/callApi';
import { callBxMethod, fetchAllPages } from './bitrixApi';
import {
  buildContactListSelect,
  extractScalarValues,
  getRecordFieldValue,
  type ContactUserFieldRecord,
  type NamedCrmField,
  userFieldToMeta,
} from './bitrixFields';
import {
  ACTUAL_PARTNER_TYPE_NAME,
  POTENTIAL_PARTNER_TYPE_IDS,
  buildPartnersContactFilter,
  loadContactTypes,
  type ContactTypeStatus,
} from './partnersDirectory';
import { formatContactName, formatContactNameForFilter, buildPartnerEventsListPath, EVENT_PARTNER_FIELD, EVENT_PARTNER_FIELD_META } from './partnersPotentialChart';
import { OUR_EVENTS_ENTITY_TYPE_ID } from './ourEventsMetric';
import { appendCrmContactListFilter } from './bitrixListFilter';
import {
  NOSOLOGY_CONTACT_FIELD,
  buildLabelMapFromFieldDefinition,
  extractFieldValues,
  loadIblockElementLabelMap,
  getNosologyIblockId,
} from './nosologiesMetric';
import { countTouchesByKind, loadTouchesByContactIds, resolveTouchesPeriod } from './monthlyTouches';
import {
  buildContactTasksListPath,
  loadTasksByContactIds,
} from './monthlyTasks';
import { buildAgreementListPath } from './monthlyAgreement';
import type { MonthlyChipOption, MonthlyReportRow } from '../mock/monthlyReportData';

/** Статус отношений / тип в отчётности. */
export const RELATION_STATUS_FIELD = 'UF_CRM_1786959383413';

/** Частые значения UF_CRM_1786959383413, вынесенные в «Тип партнера». */
export const PARTNER_TYPE_RELATION_LABELS = {
  active: 'действующий',
  new: 'новый',
} as const;

/** Текущий статус. */
export const CURRENT_STATUS_FIELD = 'UF_CRM_1787148090748';

/** Чем интересен. */
export const INTEREST_FIELD = 'UF_CRM_1787151854817';

/** Мероприятия конкурентов (entityTypeId). */
export const COMPETITOR_EVENTS_ENTITY_TYPE_ID = 1210;

export const COMPETITOR_EVENTS_LIST_PATH = `/crm/type/${COMPETITOR_EVENTS_ENTITY_TYPE_ID}/list/category/0/`;

export function buildCompetitorEventsListPath(
  contactId: string,
  contactLabel?: string,
): string {
  const params = new URLSearchParams();
  appendCrmContactListFilter(params, 'CONTACT_ID', contactId, contactLabel);
  return `${COMPETITOR_EVENTS_LIST_PATH}?${params.toString()}`;
}

export function buildOurEventsForContactPath(
  contactId: string,
  contactLabel?: string,
): string {
  return buildPartnerEventsListPath(
    EVENT_PARTNER_FIELD,
    contactId,
    contactLabel,
    EVENT_PARTNER_FIELD_META,
    OUR_EVENTS_ENTITY_TYPE_ID,
  );
}

export interface MonthlyReportLoadResult {
  rows: MonthlyReportRow[];
  partnerTypeChips: MonthlyChipOption[];
  relationStatusChips: MonthlyChipOption[];
  relationStatusOptions: Array<{ id: string; title: string }>;
  currentStatusChips: MonthlyChipOption[];
  nosologyOptions: Array<{ id: string; title: string }>;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function firstScalar(value: unknown): string {
  const values = extractScalarValues(value);
  return values[0] ? String(values[0]) : '';
}

function resolveEnumLabel(
  raw: unknown,
  labelMap: Map<string, string>,
): { id: string; label: string } {
  const id = firstScalar(raw);
  if (!id) {
    return { id: '', label: '' };
  }
  return { id, label: labelMap.get(id) ?? labelMap.get(String(raw)) ?? id };
}

export function resolveActivePartnerTypeIds(types: ContactTypeStatus[]): string[] {
  const ids: string[] = [];

  types.forEach((type) => {
    const name = normalizeName(type.NAME ?? '');
    if (
      name.includes('действующ')
      || name === normalizeName(ACTUAL_PARTNER_TYPE_NAME)
      || name.includes('актуальн')
    ) {
      if (type.STATUS_ID) {
        ids.push(type.STATUS_ID);
      }
    }
  });

  return [...new Set(ids)];
}

export function resolvePotentialPartnerTypeIds(types: ContactTypeStatus[]): string[] {
  const ids = [...POTENTIAL_PARTNER_TYPE_IDS];

  types.forEach((type) => {
    const name = normalizeName(type.NAME ?? '');
    if (name.includes('потенциальн') && type.STATUS_ID) {
      ids.push(type.STATUS_ID);
    }
  });

  return [...new Set(ids)];
}

/** Тип партнера = частые значения того же поля, что и «Статус отношений». */
export function resolvePartnerTypeId(
  relationStatusId: string,
  relationLabelMap: Map<string, string>,
): 'active' | 'new' | '' {
  if (!relationStatusId) {
    return '';
  }

  const label = normalizeName(
    relationLabelMap.get(relationStatusId)
      ?? relationLabelMap.get(String(relationStatusId))
      ?? '',
  );

  if (label === PARTNER_TYPE_RELATION_LABELS.active || label.includes('действующ')) {
    return 'active';
  }
  if (label === PARTNER_TYPE_RELATION_LABELS.new) {
    return 'new';
  }

  return '';
}

function chipsFromLabelMap(
  labelMap: Map<string, string>,
  rows: MonthlyReportRow[],
  field: 'relationStatusId' | 'currentStatusId',
  excludeIds: Set<string> = new Set(),
): MonthlyChipOption[] {
  const seen = new Set<string>();
  const chips: MonthlyChipOption[] = [];

  labelMap.forEach((label, id) => {
    if (!/^\d+$/.test(id) || seen.has(id) || excludeIds.has(id)) {
      return;
    }
    seen.add(id);
    chips.push({
      id,
      label,
      count: rows.filter((row) => row[field] === id).length,
    });
  });

  return chips.sort((left, right) => left.label.localeCompare(right.label, 'ru'));
}

async function loadContactUserFields(): Promise<ContactUserFieldRecord[]> {
  const raw = await callBxMethod<unknown>('crm.contact.userfield.list', {});

  if (Array.isArray(raw)) {
    return raw as ContactUserFieldRecord[];
  }

  if (raw && typeof raw === 'object') {
    if ('items' in raw && Array.isArray((raw as { items?: unknown }).items)) {
      return (raw as { items: ContactUserFieldRecord[] }).items;
    }
    return Object.values(raw as Record<string, ContactUserFieldRecord>);
  }

  return [];
}

async function resolveFieldMeta(
  fieldName: string,
  userFields: ContactUserFieldRecord[],
): Promise<NamedCrmField | null> {
  const userField = userFields.find((field) => field.FIELD_NAME === fieldName) ?? null;
  return userField ? userFieldToMeta(userField) : null;
}

async function resolveNosologyLabels(
  userFields: ContactUserFieldRecord[],
): Promise<Map<string, string>> {
  const userField = userFields.find((field) => field.FIELD_NAME === NOSOLOGY_CONTACT_FIELD) ?? null;
  const iblockId = getNosologyIblockId(userField);
  if (iblockId) {
    return loadIblockElementLabelMap(iblockId);
  }
  return buildLabelMapFromFieldDefinition(userField ? userFieldToMeta(userField) : null);
}

async function loadCompanyTitles(companyIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(companyIds.filter(Boolean))];
  const titles = new Map<string, string>();
  if (!uniqueIds.length) {
    return titles;
  }

  const raw = await callApi(
    'crm.company.list',
    { ID: uniqueIds },
    ['ID', 'TITLE'],
    null,
    0,
    0,
  );

  const companies = (Array.isArray(raw) ? raw.flat(Infinity) : []) as Array<{
    ID?: string | number;
    TITLE?: string;
  }>;

  companies.forEach((company) => {
    const id = String(company.ID ?? '');
    if (id) {
      titles.set(id, String(company.TITLE ?? `Компания #${id}`));
    }
  });

  return titles;
}

function parseContactDateParts(value: unknown): { month: number; year: string } {
  const raw = String(value ?? '');
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return { year: match[1], month: Number(match[2]) };
  }
  const now = new Date();
  return { year: String(now.getFullYear()), month: now.getMonth() + 1 };
}

function formatInterestValue(
  raw: unknown,
  labelMap: Map<string, string>,
): string {
  const values = extractFieldValues(raw);
  if (!values.length) {
    const text = firstScalar(raw);
    return text;
  }

  return values
    .map((value) => labelMap.get(value) ?? value)
    .filter(Boolean)
    .join(', ');
}

export function mapContactToMonthlyRow(
  contact: Record<string, unknown>,
  options: {
    activeTypeIds: Set<string>;
    potentialTypeIds: Set<string>;
    relationLabelMap: Map<string, string>;
    currentLabelMap: Map<string, string>;
    interestLabelMap: Map<string, string>;
    nosologyLabelMap: Map<string, string>;
    companyTitles: Map<string, string>;
    relationMeta: NamedCrmField | null;
    currentMeta: NamedCrmField | null;
    interestMeta: NamedCrmField | null;
    nosologyMeta: NamedCrmField | null;
  },
): MonthlyReportRow | null {
  const id = String(contact.ID ?? '');
  if (!id) {
    return null;
  }

  const typeId = String(contact.TYPE_ID ?? '');
  const isPartnerByType = options.activeTypeIds.has(typeId) || options.potentialTypeIds.has(typeId);
  if (!isPartnerByType) {
    return null;
  }

  const relation = resolveEnumLabel(
    getRecordFieldValue(contact, RELATION_STATUS_FIELD, options.relationMeta),
    options.relationLabelMap,
  );
  const partnerTypeId = resolvePartnerTypeId(relation.id, options.relationLabelMap);
  const current = resolveEnumLabel(
    getRecordFieldValue(contact, CURRENT_STATUS_FIELD, options.currentMeta),
    options.currentLabelMap,
  );

  const nosologyIds = extractFieldValues(
    getRecordFieldValue(contact, NOSOLOGY_CONTACT_FIELD, options.nosologyMeta),
  );
  const nosologies = nosologyIds
    .map((nosologyId) => options.nosologyLabelMap.get(nosologyId) ?? nosologyId)
    .filter(Boolean)
    .join(', ');

  const interest = formatInterestValue(
    getRecordFieldValue(contact, INTEREST_FIELD, options.interestMeta),
    options.interestLabelMap,
  );

  const companyId = firstScalar(contact.COMPANY_ID);
  const { month, year } = parseContactDateParts(contact.DATE_CREATE);
  const filterName = formatContactNameForFilter({
    ID: id,
    NAME: contact.NAME as string | undefined,
    LAST_NAME: contact.LAST_NAME as string | undefined,
    SECOND_NAME: contact.SECOND_NAME as string | undefined,
  });

  return {
    id,
    partnerName: formatContactName({
      ID: id,
      NAME: contact.NAME as string | undefined,
      LAST_NAME: contact.LAST_NAME as string | undefined,
      SECOND_NAME: contact.SECOND_NAME as string | undefined,
    }),
    organization: options.companyTitles.get(companyId) ?? '',
    nosologies,
    nosologyIds,
    relationStatus: relation.label,
    relationStatusId: relation.id,
    interest,
    agreementLink: buildAgreementListPath(id, filterName),
    ourEventsLink: buildOurEventsForContactPath(id, filterName),
    competitorEventsLink: buildCompetitorEventsListPath(id, filterName),
    calls: 0,
    emails: 0,
    meetings: 0,
    touches: [],
    currentStatus: current.label,
    currentStatusId: current.id,
    comment: '',
    nextStep: '',
    tasks: 0,
    taskIds: [],
    taskItems: [],
    tasksLink: buildContactTasksListPath(id),
    companyId,
    partnerTypeId,
    assignedId: firstScalar(contact.ASSIGNED_BY_ID),
    month,
    year,
  };
}

export async function loadMonthlyReportData(
  options: { contactIds?: string[] } = {},
): Promise<MonthlyReportLoadResult> {
  const [types, userFields] = await Promise.all([
    loadContactTypes(),
    loadContactUserFields(),
  ]);

  const activeTypeIds = resolveActivePartnerTypeIds(types);
  const potentialTypeIds = resolvePotentialPartnerTypeIds(types);
  const allTypeIds = [...new Set([...activeTypeIds, ...potentialTypeIds])];
  const contactIds = (options.contactIds ?? []).map(String).filter(Boolean);

  if (!allTypeIds.length && !contactIds.length) {
    return {
      rows: [],
      partnerTypeChips: [
        { id: 'active', label: 'Действующие партнеры', count: 0 },
        { id: 'new', label: 'Новые партнеры', count: 0 },
      ],
      relationStatusChips: [],
      relationStatusOptions: [],
      currentStatusChips: [],
      nosologyOptions: [],
    };
  }

  const [relationMeta, currentMeta, interestMeta, nosologyMeta, nosologyLabelMap] = await Promise.all([
    resolveFieldMeta(RELATION_STATUS_FIELD, userFields),
    resolveFieldMeta(CURRENT_STATUS_FIELD, userFields),
    resolveFieldMeta(INTEREST_FIELD, userFields),
    resolveFieldMeta(NOSOLOGY_CONTACT_FIELD, userFields),
    resolveNosologyLabels(userFields),
  ]);

  const relationLabelMap = buildLabelMapFromFieldDefinition(relationMeta);
  const currentLabelMap = buildLabelMapFromFieldDefinition(currentMeta);
  const interestLabelMap = buildLabelMapFromFieldDefinition(interestMeta);

  const select = [...new Set([
    ...buildContactListSelect(NOSOLOGY_CONTACT_FIELD, nosologyMeta, [
      'TYPE_ID',
      'COMPANY_ID',
      'DATE_CREATE',
      'NAME',
      'LAST_NAME',
      'SECOND_NAME',
    ]),
    ...buildContactListSelect(RELATION_STATUS_FIELD, relationMeta),
    ...buildContactListSelect(CURRENT_STATUS_FIELD, currentMeta),
    ...buildContactListSelect(INTEREST_FIELD, interestMeta),
  ])];

  const filter = contactIds.length
    ? (contactIds.length === 1 ? { ID: contactIds[0] } : { '@ID': contactIds })
    : buildPartnersContactFilter(allTypeIds);

  const contacts = await fetchAllPages<Record<string, unknown>>('crm.contact.list', {
    filter,
    select,
  });

  const companyIds = contacts
    .map((contact) => firstScalar(contact.COMPANY_ID))
    .filter(Boolean);
  const companyTitles = await loadCompanyTitles(companyIds);

  const activeSet = new Set(activeTypeIds);
  const potentialSet = new Set(potentialTypeIds);

  const rows = contacts
    .map((contact) => {
      const mapped = mapContactToMonthlyRow(contact, {
        activeTypeIds: activeSet,
        potentialTypeIds: potentialSet,
        relationLabelMap,
        currentLabelMap,
        interestLabelMap,
        nosologyLabelMap,
        companyTitles,
        relationMeta,
        currentMeta,
        interestMeta,
        nosologyMeta,
      });

      if (mapped) {
        return mapped;
      }

      // Для точечных тестов по ID допускаем контакт вне типов партнёра.
      if (!contactIds.length) {
        return null;
      }

      const id = String(contact.ID ?? '');
      if (!id || !contactIds.includes(id)) {
        return null;
      }

      const forcedActive = new Set([...activeSet, String(contact.TYPE_ID ?? '')]);
      return mapContactToMonthlyRow(contact, {
        activeTypeIds: forcedActive,
        potentialTypeIds: potentialSet,
        relationLabelMap,
        currentLabelMap,
        interestLabelMap,
        nosologyLabelMap,
        companyTitles,
        relationMeta,
        currentMeta,
        interestMeta,
        nosologyMeta,
      });
    })
    .filter((row): row is MonthlyReportRow => row != null)
    .sort((left, right) => left.partnerName.localeCompare(right.partnerName, 'ru'));

  const touchesByContact = await loadTouchesByContactIds(rows.map((row) => row.id));
  const tasksByContact = await loadTasksByContactIds(rows.map((row) => row.id));
  const currentTouchesPeriod = resolveTouchesPeriod();
  const rowsWithTouches = rows.map((row) => {
    const touches = touchesByContact.get(row.id) ?? [];
    const tasks = tasksByContact.get(row.id) ?? [];
    const taskIds = tasks.map((task) => task.id);
    return {
      ...row,
      touches,
      calls: countTouchesByKind(
        touches,
        'calls',
        currentTouchesPeriod.months,
        currentTouchesPeriod.years,
      ),
      emails: countTouchesByKind(
        touches,
        'emails',
        currentTouchesPeriod.months,
        currentTouchesPeriod.years,
      ),
      meetings: countTouchesByKind(
        touches,
        'meetings',
        currentTouchesPeriod.months,
        currentTouchesPeriod.years,
      ),
      tasks: taskIds.length,
      taskIds,
      taskItems: tasks,
      tasksLink: buildContactTasksListPath(row.id, taskIds),
    };
  });

  const nosologyOptions = [...nosologyLabelMap.entries()]
    .filter(([id]) => /^\d+$/.test(id))
    .map(([id, title]) => ({ id, title }))
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));

  // «Новый» / «Действующий» дублируются в «Тип партнера» и «Статус отношений» — по ТЗ
  const relationStatusOptions = [...relationLabelMap.entries()]
    .filter(([id]) => /^\d+$/.test(id))
    .map(([id, title]) => ({ id, title }))
    .filter((option, index, list) => list.findIndex((item) => item.id === option.id) === index)
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));

  return {
    rows: rowsWithTouches,
    partnerTypeChips: [
      {
        id: 'active',
        label: 'Действующие партнеры',
        count: rowsWithTouches.filter((row) => row.partnerTypeId === 'active').length,
      },
      {
        id: 'new',
        label: 'Новые партнеры',
        count: rowsWithTouches.filter((row) => row.partnerTypeId === 'new').length,
      },
    ],
    relationStatusChips: chipsFromLabelMap(
      relationLabelMap,
      rowsWithTouches,
      'relationStatusId',
    ),
    relationStatusOptions,
    currentStatusChips: chipsFromLabelMap(currentLabelMap, rowsWithTouches, 'currentStatusId'),
    nosologyOptions,
  };
}

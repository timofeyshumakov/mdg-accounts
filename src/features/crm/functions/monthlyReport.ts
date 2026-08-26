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
import { formatContactName } from './partnersPotentialChart';
import {
  NOSOLOGY_CONTACT_FIELD,
  buildLabelMapFromFieldDefinition,
  extractFieldValues,
  loadIblockElementLabelMap,
  getNosologyIblockId,
} from './nosologiesMetric';
import type { MonthlyChipOption, MonthlyReportRow } from '../mock/monthlyReportData';

/** Статус отношений / тип в отчётности. */
export const RELATION_STATUS_FIELD = 'UF_CRM_1786959383413';

/** Текущий статус. */
export const CURRENT_STATUS_FIELD = 'UF_CRM_1787148090748';

export interface MonthlyReportLoadResult {
  rows: MonthlyReportRow[];
  partnerTypeChips: MonthlyChipOption[];
  relationStatusChips: MonthlyChipOption[];
  currentStatusChips: MonthlyChipOption[];
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

function chipsFromLabelMap(
  labelMap: Map<string, string>,
  rows: MonthlyReportRow[],
  field: 'relationStatusId' | 'currentStatusId',
): MonthlyChipOption[] {
  const seen = new Set<string>();
  const chips: MonthlyChipOption[] = [];

  labelMap.forEach((label, id) => {
    if (!/^\d+$/.test(id) || seen.has(id)) {
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

export function mapContactToMonthlyRow(
  contact: Record<string, unknown>,
  options: {
    activeTypeIds: Set<string>;
    potentialTypeIds: Set<string>;
    relationLabelMap: Map<string, string>;
    currentLabelMap: Map<string, string>;
    nosologyLabelMap: Map<string, string>;
    companyTitles: Map<string, string>;
    relationMeta: NamedCrmField | null;
    currentMeta: NamedCrmField | null;
    nosologyMeta: NamedCrmField | null;
  },
): MonthlyReportRow | null {
  const id = String(contact.ID ?? '');
  if (!id) {
    return null;
  }

  const typeId = String(contact.TYPE_ID ?? '');
  let partnerTypeId: 'active' | 'new' | '' = '';
  if (options.activeTypeIds.has(typeId)) {
    partnerTypeId = 'active';
  } else if (options.potentialTypeIds.has(typeId)) {
    partnerTypeId = 'new';
  } else {
    return null;
  }

  const relation = resolveEnumLabel(
    getRecordFieldValue(contact, RELATION_STATUS_FIELD, options.relationMeta),
    options.relationLabelMap,
  );
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

  const companyId = firstScalar(contact.COMPANY_ID);
  const { month, year } = parseContactDateParts(contact.DATE_CREATE);

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
    relationStatus: relation.label,
    relationStatusId: relation.id,
    interest: '',
    agreementLink: '#',
    ourEventsLink: '#',
    competitorEventsLink: '#',
    calls: 0,
    emails: 0,
    meetings: 0,
    currentStatus: current.label,
    currentStatusId: current.id,
    comment: '',
    nextStep: '',
    tasks: 0,
    partnerTypeId,
    assignedId: firstScalar(contact.ASSIGNED_BY_ID),
    month,
    year,
  };
}

export async function loadMonthlyReportData(): Promise<MonthlyReportLoadResult> {
  const [types, userFields] = await Promise.all([
    loadContactTypes(),
    loadContactUserFields(),
  ]);

  const activeTypeIds = resolveActivePartnerTypeIds(types);
  const potentialTypeIds = resolvePotentialPartnerTypeIds(types);
  const allTypeIds = [...new Set([...activeTypeIds, ...potentialTypeIds])];

  if (!allTypeIds.length) {
    return {
      rows: [],
      partnerTypeChips: [
        { id: 'active', label: 'Действующие партнеры', count: 0 },
        { id: 'new', label: 'Новые партнеры', count: 0 },
      ],
      relationStatusChips: [],
      currentStatusChips: [],
    };
  }

  const [relationMeta, currentMeta, nosologyMeta, nosologyLabelMap] = await Promise.all([
    resolveFieldMeta(RELATION_STATUS_FIELD, userFields),
    resolveFieldMeta(CURRENT_STATUS_FIELD, userFields),
    resolveFieldMeta(NOSOLOGY_CONTACT_FIELD, userFields),
    resolveNosologyLabels(userFields),
  ]);

  const relationLabelMap = buildLabelMapFromFieldDefinition(relationMeta);
  const currentLabelMap = buildLabelMapFromFieldDefinition(currentMeta);

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
  ])];

  const contacts = await fetchAllPages<Record<string, unknown>>('crm.contact.list', {
    filter: buildPartnersContactFilter(allTypeIds),
    select,
  });

  const companyIds = contacts
    .map((contact) => firstScalar(contact.COMPANY_ID))
    .filter(Boolean);
  const companyTitles = await loadCompanyTitles(companyIds);

  const activeSet = new Set(activeTypeIds);
  const potentialSet = new Set(potentialTypeIds);

  const rows = contacts
    .map((contact) => mapContactToMonthlyRow(contact, {
      activeTypeIds: activeSet,
      potentialTypeIds: potentialSet,
      relationLabelMap,
      currentLabelMap,
      nosologyLabelMap,
      companyTitles,
      relationMeta,
      currentMeta,
      nosologyMeta,
    }))
    .filter((row): row is MonthlyReportRow => row != null)
    .sort((left, right) => left.partnerName.localeCompare(right.partnerName, 'ru'));

  return {
    rows,
    partnerTypeChips: [
      {
        id: 'active',
        label: 'Действующие партнеры',
        count: rows.filter((row) => row.partnerTypeId === 'active').length,
      },
      {
        id: 'new',
        label: 'Новые партнеры',
        count: rows.filter((row) => row.partnerTypeId === 'new').length,
      },
    ],
    relationStatusChips: chipsFromLabelMap(relationLabelMap, rows, 'relationStatusId'),
    currentStatusChips: chipsFromLabelMap(currentLabelMap, rows, 'currentStatusId'),
  };
}

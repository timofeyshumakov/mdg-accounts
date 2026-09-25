import { callApi } from '../../../functions/callApi';
import { callBxMethod, fetchAllContactList } from './bitrixApi';
import {
  buildContactListSelect,
  extractScalarValues,
  getRecordFieldValue,
  type ContactUserFieldRecord,
  type NamedCrmField,
  userFieldToMeta,
  unwrapFieldsResponse,
} from './bitrixFields';
import {
  ACTUAL_PARTNER_TYPE_NAME,
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
import { buildAgreementListPath, loadAgreementInfoForContacts } from './monthlyAgreement';
import {
  loadSpaCommentsForContacts,
  resolveReportPeriod,
} from './monthlyReportSubmit';
import {
  loadEventsForContacts,
} from './ourEventsMetric';
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

/** Поле текущего статуса для новых контактов из смарт-процесса 1236. */
export const NEW_CONTACT_STATUS_FIELD = 'UF_CRM_130_1789979741889';

/** EntityTypeId смарт-процесса для новых контактов. */
export const NEW_CONTACT_ENTITY_TYPE_ID = 1236;

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
  newCurrentStatusOptions: Array<{ id: string; title: string }>;
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

  // Приводим к пустому значению известные пустые/некорректные id
  const emptyIds = new Set(['0', 'false', '11918']);
  if (emptyIds.has(id)) {
    return { id: '', label: '' };
  }

  const label = labelMap.get(id);
  // Если id нет в маппинге — возвращаем пустую строку вместо id
  return { id, label: label || '' };
}

export function resolveActivePartnerTypeIds(types: ContactTypeStatus[]): string[] {
  const ids: string[] = ['UC_TG1YCL'];

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
  const ids = ['PARTNER'];

  types.forEach((type) => {
    const name = normalizeName(type.NAME ?? '');
    if (name.includes('новый') && type.STATUS_ID) {
      ids.push(type.STATUS_ID);
    }
  });

  return [...new Set(ids)];
}

/** Загрузка вариантов enum-поля из смарт-процесса. */
export async function loadEnumFieldOptions(
  entityTypeId: number,
  fieldName: string,
): Promise<Map<string, string>> {
  try {
    // Загружаем первые 100 элементов смарт-процесса с нужным полем
    const items = await callBxMethod<Record<string, unknown>[]>('crm.item.list', {
      entityTypeId,
      filter: {},
      select: [fieldName],
      start: 0,
    });

    console.log('loadEnumFieldOptions: loaded', items.length, 'items for', fieldName);

    // Собираем уникальные значения поля
    const valueSet = new Set<string>();
    items.forEach((item) => {
      const val = item[fieldName];
      if (val != null && val !== '') {
        if (typeof val === 'object' && 'value' in val) {
          valueSet.add(String(val.value));
        } else if (typeof val === 'string' || typeof val === 'number') {
          valueSet.add(String(val));
        }
      }
    });

    if (valueSet.size > 0) {
      const labelMap = new Map<string, string>();
      valueSet.forEach((value) => {
        labelMap.set(value, value);
      });
      console.log(`loadEnumFieldOptions: ${labelMap.size} unique values for ${fieldName}`);
      return labelMap;
    }

    console.warn('loadEnumFieldOptions: no values found for', fieldName);
    return new Map();
  } catch (error) {
    console.warn('Не удалось загрузить варианты поля', fieldName, ':', error);
    return new Map();
  }
}

function chipsFromLabelMap(
  labelMap: Map<string, string>,
  rows: MonthlyReportRow[],
  field: 'relationStatusId' | 'currentStatusId',
  excludeIds: Set<string> = new Set(),
  customOrder?: string[],
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

  if (customOrder) {
    function customSortKey(chip: MonthlyChipOption): number {
      const normalized = chip.label.trim().toLowerCase();
      const index = customOrder.findIndex(
        (label) => normalized === label.toLowerCase(),
      );
      return index >= 0 ? index : customOrder.length;
    }
    return chips.sort((left, right) => customSortKey(left) - customSortKey(right));
  }

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
  contactFields?: Record<string, NamedCrmField> | null,
): Promise<NamedCrmField | null> {
  const userField = userFields.find((field) => field.FIELD_NAME === fieldName) ?? null;
  const meta = userField ? userFieldToMeta(userField) : null;

  // Если нет вариантов enum, пробуем загрузить из crm.contact.fields
  if (!meta?.items && contactFields) {
    // Пробуем найти поле по разным варианм имени
    const fieldFromApi = contactFields[fieldName]
      ?? contactFields[fieldName.toUpperCase()]
      ?? contactFields[fieldName.toLowerCase()]
      ?? Object.values(contactFields).find(f => f.upperName === fieldName || f.fieldName === fieldName) ?? null;

    if (fieldFromApi && (fieldFromApi.items || fieldFromApi.LIST)) {
      return {
        title: fieldFromApi.title ?? meta?.title ?? '',
        fieldName,
        upperName: fieldFromApi.upperName ?? fieldName,
        isMultiple: fieldFromApi.isMultiple,
        items: fieldFromApi.items,
        LIST: fieldFromApi.LIST,
      };
    }
  }

  return meta;
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

  // Контакты уже отфильтрованы на уровне API по TYPE_ID
  // Определяем тип партнера по TYPE_ID
  const typeId = String(contact.TYPE_ID ?? '');
  let partnerTypeId: 'active' | 'new' | '' = '';
  if (options.activeTypeIds.has(typeId)) {
    partnerTypeId = 'active';
  } else if (options.potentialTypeIds.has(typeId)) {
    partnerTypeId = 'new';
  }

  if (!partnerTypeId) {
    console.log('mapContactToMonthlyRow: contact', id, 'TYPE_ID =', typeId, 'NOT in active or potential sets');
    console.log('  activeTypeIds =', [...options.activeTypeIds]);
    console.log('  potentialTypeIds =', [...options.potentialTypeIds]);
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
  options: { contactIds?: string[]; months?: number[]; years?: string[] } = {},
): Promise<MonthlyReportLoadResult> {
  const [types, userFields] = await Promise.all([
    loadContactTypes(),
    loadContactUserFields(),
  ]);

  // Загружаем поля контактов для получения enum-вариантов
  let contactFields: Record<string, NamedCrmField> | null = null;
  try {
    const rawFields = await callBxMethod<unknown>('crm.contact.fields', {});
    if (rawFields && typeof rawFields === 'object') {
      const unwrapped = unwrapFieldsResponse<Record<string, NamedCrmField>>(rawFields);
      contactFields = unwrapped;
      console.log('loadMonthlyReportData: contactFields keys =', Object.keys(unwrapped).slice(0, 10));
      const relationField = Object.entries(unwrapped).find(([k]) => k.includes('1786959383413'));
      if (relationField) {
        console.log('loadMonthlyReportData: RELATION_STATUS_FIELD found =', relationField[0], 'items =', relationField[1]?.items ? 'present' : 'missing');
      }
    }
  } catch (error) {
    console.warn('Не удалось загрузить поля контактов:', error);
  }

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
      newCurrentStatusOptions: [],
      nosologyOptions: [],
    };
  }

  const [relationMeta, currentMeta, interestMeta, nosologyMeta, nosologyLabelMap, newStatusLabelMap] = await Promise.all([
    resolveFieldMeta(RELATION_STATUS_FIELD, userFields, contactFields),
    resolveFieldMeta(CURRENT_STATUS_FIELD, userFields, contactFields),
    resolveFieldMeta(INTEREST_FIELD, userFields, contactFields),
    resolveFieldMeta(NOSOLOGY_CONTACT_FIELD, userFields, contactFields),
    resolveNosologyLabels(userFields),
    loadEnumFieldOptions(NEW_CONTACT_ENTITY_TYPE_ID, NEW_CONTACT_STATUS_FIELD),
  ]);

  const relationLabelMap = buildLabelMapFromFieldDefinition(relationMeta);
  const currentLabelMap = buildLabelMapFromFieldDefinition(currentMeta);
  const interestLabelMap = buildLabelMapFromFieldDefinition(interestMeta);

  console.log('loadMonthlyReportData: relationMeta items =', relationMeta?.items ? 'present' : 'missing');
  console.log('loadMonthlyReportData: relationLabelMap size =', relationLabelMap.size);
  if (relationLabelMap.size > 0) {
    console.log('loadMonthlyReportData: relationLabelMap entries =', [...relationLabelMap.entries()].slice(0, 5));
  }

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

  const contacts = await fetchAllContactList<Record<string, unknown>>({
    filter,
    select,
  });

  const companyIds = contacts
    .map((contact) => firstScalar(contact.COMPANY_ID))
    .filter(Boolean);
  const companyTitles = await loadCompanyTitles(companyIds);

  // Загружаем комментарии из SPA-отчетов за текущий период
  const loadedContactIds = contacts.map((contact) => String(contact.ID ?? '')).filter(Boolean);
  const reportPeriod = resolveReportPeriod([]);
  const spaComments = await loadSpaCommentsForContacts(loadedContactIds, reportPeriod);

  // Загружаем мероприятия за выбранный период
  const eventsPeriod = resolveTouchesPeriod(options.months ?? [], options.years ?? []);
  const eventsByContact = await loadEventsForContacts(
    loadedContactIds,
    eventsPeriod.months,
    eventsPeriod.years,
  );

  // Загружаем договоренности
  const agreementsByContact = await loadAgreementInfoForContacts(loadedContactIds);

  const activeSet = new Set(activeTypeIds);
  const potentialSet = new Set(potentialTypeIds);

  console.log('loadMonthlyReportData: activeTypeIds =', activeTypeIds);
  console.log('loadMonthlyReportData: potentialTypeIds =', potentialTypeIds);
  console.log('loadMonthlyReportData: contacts count =', contacts.length);
  if (contacts.length > 0) {
    console.log('loadMonthlyReportData: first contact TYPE_ID =', contacts[0].TYPE_ID);
  }

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
        // Добавляем комментарий из SPA-отчета
        const contactId = String(contact.ID ?? '');
        const spaComment = spaComments.get(contactId);
        const contactEvents = eventsByContact.get(contactId) ?? [];
        const agreementInfo = agreementsByContact.get(contactId) || null;
        
        const result = {
          ...mapped,
          comment: spaComment || mapped.comment,
          events: contactEvents.map((ev) => ({
            id: ev.id,
            title: ev.title,
            startDate: ev.startDate,
            endDate: ev.endDate,
          })),
          agreementInfo,
        };
        return result;
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
      const mappedForced = mapContactToMonthlyRow(contact, {
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

      // Добавляем комментарий из SPA-отчета
      const spaComment = spaComments.get(id);
      const contactEvents = eventsByContact.get(id) ?? [];
      const agreementInfo = agreementsByContact.get(id) || null;
      
      if (spaComment && mappedForced) {
        return {
          ...mappedForced,
          comment: spaComment,
          events: contactEvents.map((ev) => ({
            id: ev.id,
            title: ev.title,
            startDate: ev.startDate,
            endDate: ev.endDate,
          })),
          agreementInfo,
        };
      }
      
      if (mappedForced) {
        return {
          ...mappedForced,
          events: contactEvents.map((ev) => ({
            id: ev.id,
            title: ev.title,
            startDate: ev.startDate,
            endDate: ev.endDate,
          })),
          agreementInfo,
        };
      }

      return mappedForced;
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
  const RELATION_STATUS_ORDER = [
    'актуальный',
    'потенциальный',
    'постоянный',
    'хороший',
    'нейтральный',
    'требует восстановления',
    'новый',
  ];

  function relationStatusSortKey(option: { title: string }): number {
    const normalized = option.title.trim().toLowerCase();
    const index = RELATION_STATUS_ORDER.findIndex(
      (label) => normalized === label.toLowerCase(),
    );
    return index >= 0 ? index : RELATION_STATUS_ORDER.length;
  }

  const relationStatusOptions = [...relationLabelMap.entries()]
    .map(([id, title]) => ({ id, title }))
    .filter((option, index, list) => {
      // Фильтруем дубликаты по id и по title
      if (list.findIndex((item) => item.id === option.id) !== index) {
        return false;
      }
      if (list.findIndex((item) => item.title === option.title) !== index) {
        return false;
      }
      return true;
    })
    .sort((left, right) => relationStatusSortKey(left) - relationStatusSortKey(right));

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
      new Set(),
      RELATION_STATUS_ORDER,
    ),
    relationStatusOptions,
    currentStatusChips: chipsFromLabelMap(currentLabelMap, rowsWithTouches, 'currentStatusId'),
    newCurrentStatusOptions: [...newStatusLabelMap.entries()]
      .filter(([id]) => /^\d+$/.test(id))
      .map(([id, title]) => ({ id, title }))
      .sort((left, right) => left.title.localeCompare(right.title, 'ru')),
    nosologyOptions,
  };
}

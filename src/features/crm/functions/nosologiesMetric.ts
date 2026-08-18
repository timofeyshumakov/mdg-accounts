import { callBxMethod, fetchAllPages } from './bitrixApi';
import {
  buildContactListSelect,
  extractScalarValues,
  findContactUserFieldByLabel,
  findFieldByLabel,
  getRecordFieldValue,
  NamedCrmField,
  ContactUserFieldRecord,
  resolveApiFieldName,
  unwrapFieldsResponse,
  userFieldToMeta,
} from './bitrixFields';
import type { ChartItem } from '../mock/dashboardData';
import {
  buildPartnersContactFilter,
  getPartnerTypeIds,
} from './partnersDirectory';

/** Поле «Нозология» у контактов в Bitrix24. */
export const NOSOLOGY_CONTACT_FIELD = 'UF_CRM_1782832034';

/** Универсальный список «Нозологии» (iblock_element). */
export const NOSOLOGY_IBLOCK_ID = 216;

export interface PartnerNosologyData {
  contacts: Record<string, unknown>[];
  fieldName: string;
  fieldMeta: NamedCrmField | null;
  labelMap: Map<string, string>;
}

interface EnumerationItem {
  ID?: string | number;
  VALUE?: string;
  id?: string | number;
  value?: string;
}

interface IblockListElement {
  ID?: string | number;
  NAME?: string;
}

function splitPipeSeparatedIds(value: string): string[] {
  if (!value.includes('|')) {
    return [value];
  }

  const parts = value.split('|').filter(Boolean);
  if (parts.length > 1 && parts.every((part) => /^\d+$/.test(part))) {
    return parts;
  }

  return [value];
}

export function extractFieldValues(value: unknown): string[] {
  return extractScalarValues(value).flatMap(splitPipeSeparatedIds);
}

export function countFieldElements(value: unknown): number {
  return extractFieldValues(value).length;
}

export function buildLabelMapFromFieldDefinition(
  field?: NamedCrmField | null,
): Map<string, string> {
  const labelMap = new Map<string, string>();
  const items = field?.items ?? field?.LIST;

  if (!items) {
    return labelMap;
  }

  const normalizedItems = Array.isArray(items)
    ? items
    : Object.values(items as Record<string, EnumerationItem>);

  normalizedItems.forEach((item) => {
    const id = String(item.ID ?? item.id ?? '');
    const value = String(item.VALUE ?? item.value ?? id);

    if (id) {
      labelMap.set(id, value);
    }

    labelMap.set(value, value);
  });

  return labelMap;
}

export function getNosologyIblockId(
  userField?: ContactUserFieldRecord | null,
): number | null {
  if (userField?.USER_TYPE_ID !== 'iblock_element') {
    return null;
  }

  const iblockId = Number(userField.SETTINGS?.IBLOCK_ID);
  if (Number.isFinite(iblockId) && iblockId > 0) {
    return iblockId;
  }

  return NOSOLOGY_IBLOCK_ID;
}

export function buildLabelMapFromIblockElements(
  elements: IblockListElement[],
): Map<string, string> {
  const labelMap = new Map<string, string>();

  elements.forEach((element) => {
    const id = String(element.ID ?? '');
    const name = String(element.NAME ?? '').trim();

    if (id && name) {
      labelMap.set(id, name);
    }
  });

  return labelMap;
}

export async function loadIblockElementLabelMap(
  iblockId: number = NOSOLOGY_IBLOCK_ID,
): Promise<Map<string, string>> {
  const elements = await fetchAllPages<IblockListElement>('lists.element.get', {
    IBLOCK_TYPE_ID: 'lists',
    IBLOCK_ID: iblockId,
    SELECT: ['ID', 'NAME'],
  });

  return buildLabelMapFromIblockElements(elements);
}

async function loadNosologyLabelMap(
  userField: ContactUserFieldRecord | null,
  fieldMeta: NamedCrmField | null,
): Promise<Map<string, string>> {
  const iblockId = getNosologyIblockId(userField);
  if (iblockId) {
    return loadIblockElementLabelMap(iblockId);
  }

  return buildLabelMapFromFieldDefinition(fieldMeta);
}

export function aggregateNosologyCounts(
  contacts: Record<string, unknown>[],
  fieldName: string,
  labelMap: Map<string, string>,
  fieldMeta?: NamedCrmField | null,
): Map<string, number> {
  const counts = new Map<string, number>();

  contacts.forEach((contact) => {
    const rawValue = getRecordFieldValue(contact, fieldName, fieldMeta);
    extractFieldValues(rawValue).forEach((raw) => {
      const label = labelMap.get(raw) ?? raw;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  });

  return counts;
}

export function mapCountsToChartItems(counts: Map<string, number>): ChartItem[] {
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) =>
      right.value - left.value || left.label.localeCompare(right.label, 'ru'),
    );
}

async function loadContactUserFields(): Promise<ContactUserFieldRecord[]> {
  const raw = await callBxMethod<unknown>('crm.contact.userfield.list', {});

  if (Array.isArray(raw)) {
    return raw;
  }

  if (raw && typeof raw === 'object') {
    if ('items' in raw && Array.isArray((raw as { items?: unknown }).items)) {
      return (raw as { items: ContactUserFieldRecord[] }).items;
    }

    return Object.values(raw as Record<string, ContactUserFieldRecord>);
  }

  return [];
}

async function resolveNosologyField(): Promise<{
  fieldName: string;
  fieldMeta: NamedCrmField | null;
  userField: ContactUserFieldRecord | null;
}> {
  const userFields = await loadContactUserFields();
  const userField = userFields.find(
    (field) => field.FIELD_NAME === NOSOLOGY_CONTACT_FIELD,
  ) ?? findContactUserFieldByLabel(
    userFields,
    (label) => label.includes('нозолог'),
  ) ?? null;

  if (userField?.FIELD_NAME) {
    const fieldMeta = userFieldToMeta(userField);
    return {
      fieldName: resolveApiFieldName(NOSOLOGY_CONTACT_FIELD, fieldMeta),
      fieldMeta,
      userField,
    };
  }

  const contactFields = unwrapFieldsResponse<Record<string, NamedCrmField>>(
    await callBxMethod<unknown>('crm.contact.fields', {}),
  );
  const fieldMeta = contactFields[NOSOLOGY_CONTACT_FIELD]
    ?? (() => {
      const matchedFieldName = findFieldByLabel(
        contactFields,
        (label) => label.includes('нозолог'),
      );
      return matchedFieldName ? contactFields[matchedFieldName] ?? null : null;
    })();

  return {
    fieldName: NOSOLOGY_CONTACT_FIELD,
    fieldMeta,
    userField: null,
  };
}

export async function loadPartnerContactsNosologies(): Promise<PartnerNosologyData> {
  const [typeIds, nosologyField] = await Promise.all([
    getPartnerTypeIds(),
    resolveNosologyField(),
  ]);
  const { fieldName, fieldMeta, userField } = nosologyField;
  const labelMap = await loadNosologyLabelMap(userField, fieldMeta);

  const contacts = await fetchAllPages<Record<string, unknown>>('crm.contact.list', {
    filter: buildPartnersContactFilter(typeIds),
    select: buildContactListSelect(fieldName, fieldMeta),
  });

  return { contacts, fieldName, fieldMeta, labelMap };
}

export async function getNosologiesCount(): Promise<number> {
  const { contacts, fieldName, fieldMeta } = await loadPartnerContactsNosologies();

  return contacts.reduce(
    (total, contact) => total + countFieldElements(getRecordFieldValue(contact, fieldName, fieldMeta)),
    0,
  );
}

export async function getNosologiesPartnersChartItems(): Promise<ChartItem[]> {
  const { contacts, fieldName, fieldMeta, labelMap } = await loadPartnerContactsNosologies();
  const counts = aggregateNosologyCounts(contacts, fieldName, labelMap, fieldMeta);

  return mapCountsToChartItems(counts);
}

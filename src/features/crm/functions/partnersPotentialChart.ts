import type { ChartItem } from '../mock/dashboardData';
import { fetchAllCrmItems, fetchAllPages } from './bitrixApi';
import {
  buildCrmItemListSelect,
  extractEntityIds,
  findFieldByLabel,
  getFieldLabel,
  getRecordFieldValue,
  NamedCrmField,
} from './bitrixFields';
import { openBitrixPath } from './bitrixPath';
import { appendCrmContactListFilter } from './bitrixListFilter';
import { buildOurEventsListPath } from './crmNavigation';
import { OUR_EVENTS_ENTITY_TYPE_ID, getOurEventsEntityTypeId } from './ourEventsMetric';

/** Партнёр мероприятия — стандартное поле «Контакт». */
export const EVENT_PARTNER_FIELD = 'contactId';
export const EVENT_PARTNER_FIELD_UPPER = 'CONTACT_ID';

/** Поле «Собранная сумма» (money) у мероприятий. */
export const EVENT_COLLECTED_SUM_FIELD = 'UF_CRM_38_1750949359532';
export const EVENT_COLLECTED_SUM_FIELD_CAMEL = 'ufCrm38_1750949359532';

const EVENT_PARTNER_FIELD_META: NamedCrmField = {
  title: 'Контакт',
  fieldName: EVENT_PARTNER_FIELD,
  upperName: EVENT_PARTNER_FIELD_UPPER,
  type: 'crm_contact',
};

const EVENT_COLLECTED_SUM_FIELD_META: NamedCrmField = {
  title: 'Собранная сумма',
  fieldName: EVENT_COLLECTED_SUM_FIELD_CAMEL,
  upperName: EVENT_COLLECTED_SUM_FIELD,
  type: 'money',
};

interface ContactListItem {
  ID: string;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function parseMoneyValue(value: unknown): number {
  if (value == null || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value)
    .replace(/\|RUB/gi, '')
    .replace(/\s/g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function findEventPartnerField(
  fields: Record<string, NamedCrmField>,
): string | null {
  if (fields[EVENT_PARTNER_FIELD] || fields[EVENT_PARTNER_FIELD_UPPER]) {
    return EVENT_PARTNER_FIELD;
  }

  const contactFields = Object.entries(fields).filter(
    ([name, field]) => (field.type ?? '').includes('crm_contact')
      && !name.toLowerCase().includes('assigned'),
  );

  const partnerMatch = contactFields.find(([, field]) => {
    const label = normalizeLabel(getFieldLabel(field));
    return label.includes('партнер') || label.includes('партнёр');
  });
  if (partnerMatch) {
    return partnerMatch[0];
  }

  const contactMatch = contactFields.find(([, field]) =>
    normalizeLabel(getFieldLabel(field)) === 'контакт');
  if (contactMatch) {
    return contactMatch[0];
  }

  return contactFields.length === 1 ? contactFields[0][0] : null;
}

export function findEventCollectedSumField(
  fields: Record<string, NamedCrmField>,
): string | null {
  if (fields[EVENT_COLLECTED_SUM_FIELD_CAMEL]?.type === 'money') {
    return EVENT_COLLECTED_SUM_FIELD_CAMEL;
  }

  if (fields[EVENT_COLLECTED_SUM_FIELD]?.type === 'money') {
    return EVENT_COLLECTED_SUM_FIELD;
  }

  const byLabel = findFieldByLabel(fields, (label) =>
    label.includes('собран') && label.includes('сумм'));

  if (byLabel && fields[byLabel]?.type === 'money') {
    return byLabel;
  }

  return EVENT_COLLECTED_SUM_FIELD_CAMEL;
}

export function buildEventListSelect(
  partnerField: string = EVENT_PARTNER_FIELD,
  partnerFieldMeta: NamedCrmField | null = EVENT_PARTNER_FIELD_META,
): string[] {
  return buildCrmItemListSelect([
    { name: partnerField, meta: partnerFieldMeta },
    {
      name: EVENT_COLLECTED_SUM_FIELD,
      meta: EVENT_COLLECTED_SUM_FIELD_META,
    },
  ]);
}

export function getEventCollectedSumValue(
  event: Record<string, unknown>,
  collectedSumFieldMeta: NamedCrmField | null = EVENT_COLLECTED_SUM_FIELD_META,
): unknown {
  return getRecordFieldValue(event, EVENT_COLLECTED_SUM_FIELD, collectedSumFieldMeta)
    ?? event[EVENT_COLLECTED_SUM_FIELD]
    ?? event[EVENT_COLLECTED_SUM_FIELD_CAMEL];
}

export function getEventPartnerValue(
  event: Record<string, unknown>,
  partnerField: string = EVENT_PARTNER_FIELD,
  partnerFieldMeta: NamedCrmField | null = EVENT_PARTNER_FIELD_META,
): unknown {
  return getRecordFieldValue(event, partnerField, partnerFieldMeta);
}

export function aggregatePartnerCollectedSums(
  events: Record<string, unknown>[],
  partnerField: string = EVENT_PARTNER_FIELD,
  _collectedSumField?: string,
  partnerFieldMeta: NamedCrmField | null = EVENT_PARTNER_FIELD_META,
  collectedSumFieldMeta: NamedCrmField | null = EVENT_COLLECTED_SUM_FIELD_META,
): Map<string, number> {
  const totals = new Map<string, number>();

  events.forEach((event) => {
    const partnerValue = getEventPartnerValue(event, partnerField, partnerFieldMeta);
    const amount = parseMoneyValue(
      getEventCollectedSumValue(event, collectedSumFieldMeta),
    );

    const partnerIds = extractEntityIds(partnerValue);
    if (!partnerIds.length || amount <= 0) {
      return;
    }

    partnerIds.forEach((partnerId) => {
      totals.set(partnerId, (totals.get(partnerId) ?? 0) + amount);
    });
  });

  return totals;
}

export function formatContactName(contact: ContactListItem): string {
  const parts = [contact.LAST_NAME, contact.NAME, contact.SECOND_NAME]
    .filter(Boolean)
    .map(String);

  return parts.join(' ').trim() || `Контакт #${contact.ID}`;
}

export function getPartnerFieldFilterKey(
  fieldName: string,
  field?: NamedCrmField | null,
): string {
  return field?.upperName ?? fieldName;
}

export function buildPartnerEventsListPath(
  partnerField: string,
  partnerId: string,
  partnerLabel?: string,
  fieldMeta?: NamedCrmField | null,
  entityTypeId: number = OUR_EVENTS_ENTITY_TYPE_ID,
): string {
  const params = new URLSearchParams();
  const filterKey = getPartnerFieldFilterKey(partnerField, fieldMeta);

  appendCrmContactListFilter(
    params,
    filterKey,
    partnerId,
    partnerLabel,
  );

  return `${buildOurEventsListPath(entityTypeId)}?${params.toString()}`;
}

export async function openPartnerEventsList(
  partnerId: string,
  partnerLabel?: string,
): Promise<void> {
  const entityTypeId = await getOurEventsEntityTypeId();
  openBitrixPath(buildPartnerEventsListPath(
    EVENT_PARTNER_FIELD,
    partnerId,
    partnerLabel,
    EVENT_PARTNER_FIELD_META,
    entityTypeId,
  ));
}

async function loadPartnerNames(
  partnerIds: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (!partnerIds.length) {
    return labels;
  }

  const contacts = await fetchAllPages<ContactListItem>('crm.contact.list', {
    filter: { '@ID': partnerIds },
    select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME'],
  });

  contacts.forEach((contact) => {
    labels.set(String(contact.ID), formatContactName(contact));
  });

  return labels;
}

function mapPartnerTotalsToChartItems(
  totals: Map<string, number>,
  partnerNames: Map<string, string>,
): ChartItem[] {
  return [...totals.entries()]
    .map(([partnerId, amount]) => ({
      id: partnerId,
      label: partnerNames.get(partnerId) ?? `Партнер #${partnerId}`,
      value: Math.round(amount),
    }))
    .sort((left, right) =>
      right.value - left.value || left.label.localeCompare(right.label, 'ru'),
    );
}

async function fetchEventsForPartnerChart(
  entityTypeId: number,
): Promise<Record<string, unknown>[]> {
  const select = buildEventListSelect();
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

export async function getPartnersPotentialChartItems(): Promise<ChartItem[]> {
  const entityTypeId = await getOurEventsEntityTypeId();
  const events = await fetchEventsForPartnerChart(entityTypeId);
  const totals = aggregatePartnerCollectedSums(events);
  const partnerNames = await loadPartnerNames([...totals.keys()]);

  return mapPartnerTotalsToChartItems(totals, partnerNames);
}

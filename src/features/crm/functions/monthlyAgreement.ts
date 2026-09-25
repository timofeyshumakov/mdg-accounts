import { appendCrmContactListFilter } from './bitrixListFilter';
import { fetchAllCrmItems } from './bitrixApi';

/** Формирование договорённости. */
export const AGREEMENT_ENTITY_TYPE_ID = 1236;

export const AGREEMENT_LIST_PATH = `/crm/type/${AGREEMENT_ENTITY_TYPE_ID}/list/category/0/`;

export interface AgreementInfo {
  created: string;
  source: string;
  interest: string;
  currentStatus: string;
}

export function buildAgreementListPath(
  contactId: string,
  contactLabel?: string,
): string {
  const params = new URLSearchParams();
  appendCrmContactListFilter(params, 'CONTACT_ID', contactId, contactLabel);
  return `${AGREEMENT_LIST_PATH}?${params.toString()}`;
}

export function buildAgreementCreatePath(contactId: string): string {
  return `/crm/type/${AGREEMENT_ENTITY_TYPE_ID}/details/0/?contactId=${encodeURIComponent(contactId)}`;
}

/** Загрузка последней договоренности для контактов. */
export async function loadAgreementInfoForContacts(
  contactIds: string[],
): Promise<Map<string, AgreementInfo>> {
  const agreementMap = new Map<string, AgreementInfo>();

  if (!contactIds.length) {
    return agreementMap;
  }

  const select = [
    'id',
    'contactId',
    'CONTACT_ID',
    'created',
    'CREATED_DATE',
    'source',
    'SOURCE',
    'interest',
    'INTEREST',
    'currentStatus',
    'CURRENT_STATUS',
  ];

  try {
    const items = await fetchAllCrmItems(
      AGREEMENT_ENTITY_TYPE_ID,
      select,
      {},
    );

    items.forEach((item) => {
      const contactId = extractContactIdFromAgreement(item);
      if (!contactId || !contactIds.includes(contactId)) {
        return;
      }

      // Если уже есть договоренность для контакта, оставляем первую (самую свежую)
      if (agreementMap.has(contactId)) {
        return;
      }

      const created = formatDate(item.created ?? item.CREATED_DATE);
      const source = firstScalar(item.source ?? item.SOURCE);
      const interest = firstScalar(item.interest ?? item.INTEREST);
      const currentStatus = firstScalar(item.currentStatus ?? item.CURRENT_STATUS);

      agreementMap.set(contactId, {
        created,
        source,
        interest,
        currentStatus,
      });
    });
  } catch (error) {
    console.warn('Не удалось загрузить договоренности:', error);
  }

  return agreementMap;
}

function extractContactIdFromAgreement(item: Record<string, unknown>): string {
  const raw = item.contactId ?? item.CONTACT_ID;
  if (Array.isArray(raw)) {
    return String(raw[0] ?? '').trim();
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    return String(record.id ?? record.ID ?? '').trim();
  }
  return String(raw ?? '').trim();
}

function firstScalar(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim();
  }
  if (value && typeof value === 'object' && 'value' in value) {
    return String((value as Record<string, unknown>).value ?? '').trim();
  }
  return String(value ?? '').trim();
}

function formatDate(dateValue: unknown): string {
  const raw = String(dateValue ?? '').trim();
  if (!raw) {
    return '';
  }

  // ISO формат: 2026-09-12T10:30:00+03:00
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  }

  // Русский формат: 12.09.2026
  const ruMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (ruMatch) {
    return `${ruMatch[1]}.${ruMatch[2]}.${ruMatch[3]}`;
  }

  return raw;
}

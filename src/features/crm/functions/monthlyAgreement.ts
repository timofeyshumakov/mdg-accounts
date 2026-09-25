import { appendCrmContactListFilter } from './bitrixListFilter';
import { fetchAllCrmItems, callBxMethod } from './bitrixApi';

/** Формирование договорённости. */
export const AGREEMENT_ENTITY_TYPE_ID = 1236;

export const AGREEMENT_LIST_PATH = `/crm/type/${AGREEMENT_ENTITY_TYPE_ID}/list/category/0/`;

export interface AgreementInfo {
  id: string;
  createdTime: string;
  source: string;
  interest: string;
  currentStatus: string;
  currentStatusId: string;
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

const CURRENT_STATUS_FIELD = 'UF_CRM_130_1789979741889';

/** Загрузка полей смарт-процесса договоренностей. */
async function loadAgreementFields(): Promise<Map<string, string>> {
  try {
    const raw = await callBxMethod<Record<string, unknown>>(
      'crm.item.fields',
      { entityTypeId: AGREEMENT_ENTITY_TYPE_ID },
    );

    const fieldData = raw?.['fields'] ?? raw;
    const fieldMap = new Map<string, string>();
    if (fieldData && typeof fieldData === 'object') {
      // Ключи объекта - это имена полей
      Object.keys(fieldData as Record<string, unknown>).forEach((key) => {
        fieldMap.set(key, key);
      });
    }

    console.log('loadAgreementFields: loaded fields =', [...fieldMap.entries()].slice(0, 10));
    return fieldMap;
  } catch (error) {
    console.warn('Не удалось загрузить поля смарт-процесса договоренностей:', error);
    return new Map();
  }
}

/** Загрузка вариантов enum-поля текущего статуса из смарт-процесса. */
async function loadCurrentStatusEnumMap(fieldMap: Map<string, string>): Promise<Map<string, string>> {
  try {
    const raw = await callBxMethod<Record<string, unknown>>(
      'crm.item.fields',
      { entityTypeId: AGREEMENT_ENTITY_TYPE_ID },
    );

    const fieldsData = raw?.['fields'] ?? raw;
    
    // Пробуем оба варианта имени поля
    const fieldData = fieldsData?.[CURRENT_STATUS_FIELD] ?? fieldsData?.[CURRENT_STATUS_FIELD.replace('UF_CRM_', 'ufCrm')];
    console.log('loadCurrentStatusEnumMap: fieldData =', JSON.stringify(fieldData).slice(0, 500));

    if (fieldData && typeof fieldData === 'object' && 'items' in fieldData) {
      const items = (fieldData as Record<string, unknown>).items as Array<{ ID?: string | number; VALUE?: string }>;
      if (Array.isArray(items) && items.length > 0) {
        const labelMap = new Map<string, string>();
        items.forEach((item) => {
          const id = String(item.ID ?? '');
          const value = String(item.VALUE ?? '');
          if (id && value) {
            labelMap.set(id, value);
            // Также добавляем как числовой ключ для совместимости
            const numId = String(Number(id));
            if (numId !== id) {
              labelMap.set(numId, value);
            }
          }
        });
        console.log('loadCurrentStatusEnumMap: loaded', labelMap.size, 'items =', [...labelMap.entries()]);
        return labelMap;
      }
    }

    console.warn('loadCurrentStatusEnumMap: no items found');
    return new Map();
  } catch (error) {
    console.warn('Не удалось загрузить варианты текущего статуса:', error);
    return new Map();
  }
}

/** Загрузка последней договоренности для контактов. */
export async function loadAgreementInfoForContacts(
  contactIds: string[],
): Promise<Map<string, AgreementInfo>> {
  const agreementMap = new Map<string, AgreementInfo>();

  if (!contactIds.length) {
    return agreementMap;
  }

  const fieldMap = await loadAgreementFields();
  const currentStatusLabelMap = await loadCurrentStatusEnumMap(fieldMap);

  const sourceFieldName = fieldMap.get('UF_CRM_130_1790000021910') ?? 'UF_CRM_130_1790000021910';
  const interestFieldName = fieldMap.get('UF_CRM_130_1789979240282') ?? 'UF_CRM_130_1789979240282';
  const currentStatusFieldName = fieldMap.get(CURRENT_STATUS_FIELD) ?? CURRENT_STATUS_FIELD;

  const select = [
    'id',
    'contactId',
    'CONTACT_ID',
    'createdTime',
    'CREATEDTIME',
    sourceFieldName,
    sourceFieldName.replace('UF_CRM_', 'ufCrm'),
    interestFieldName,
    interestFieldName.replace('UF_CRM_', 'ufCrm'),
    currentStatusFieldName,
    currentStatusFieldName.replace('UF_CRM_', 'ufCrm'),
  ];

  console.log('loadAgreementInfoForContacts: sourceFieldName =', sourceFieldName, 'interestFieldName =', interestFieldName, 'currentStatusFieldName =', currentStatusFieldName);

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

      const id = String(item.id ?? item.ID ?? '');
      const createdTime = formatDate(item.createdTime ?? item.CREATEDTIME);
      const source = firstScalar(item[sourceFieldName] ?? item[sourceFieldName.replace('UF_CRM_', 'ufCrm')]);
      const interest = firstScalar(item[interestFieldName] ?? item[interestFieldName.replace('UF_CRM_', 'ufCrm')]);
      const rawStatus = item[currentStatusFieldName] ?? item[currentStatusFieldName.replace('UF_CRM_', 'ufCrm')];
      
      let statusId = '';
      if (Array.isArray(rawStatus) && rawStatus.length > 0) {
        statusId = String(rawStatus[0] ?? '');
      } else if (rawStatus && typeof rawStatus === 'object' && 'value' in rawStatus) {
        statusId = String((rawStatus as Record<string, unknown>).value ?? '');
      } else if (rawStatus && typeof rawStatus === 'object' && 'ID' in rawStatus) {
        statusId = String((rawStatus as Record<string, unknown>).ID ?? '');
      } else {
        statusId = String(rawStatus ?? '');
      }
      statusId = statusId.trim();
      const currentStatus = currentStatusLabelMap.get(statusId) || statusId;

      console.log('loadAgreementInfoForContacts: contactId =', contactId, 'rawStatus =', JSON.stringify(rawStatus), 'statusId =', statusId, 'currentStatus =', currentStatus, 'mapSize =', currentStatusLabelMap.size, 'mapKeys =', [...currentStatusLabelMap.keys()]);

      agreementMap.set(contactId, {
        id,
        createdTime,
        source,
        interest,
        currentStatus,
        currentStatusId: statusId,
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

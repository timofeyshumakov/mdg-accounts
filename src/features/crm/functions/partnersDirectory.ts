import { getBx24 } from './bitrixClient';
import { openBitrixPath } from './bitrixPath';
import { appendListFilterValues } from './bitrixListFilter';

export const POTENTIAL_PARTNER_TYPE_IDS = ['SUPPLIER', 'UC_TG1YCL'] as const;

export const ACTUAL_PARTNER_TYPE_NAME = 'актуальный партнер';

export interface ContactTypeStatus {
  STATUS_ID: string;
  NAME: string;
}

const CONTACT_LIST_PATH = '/crm/contact/list/';

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolvePartnerTypeIds(
  types: ContactTypeStatus[] = [],
): string[] {
  const ids = [...POTENTIAL_PARTNER_TYPE_IDS];

  const actualPartner = types.find(
    (type) => normalizeName(type.NAME ?? '') === normalizeName(ACTUAL_PARTNER_TYPE_NAME),
  );

  if (actualPartner?.STATUS_ID) {
    ids.push(actualPartner.STATUS_ID);
  }

  return [...new Set(ids)];
}

function resolvePartnerTypeLabel(
  typeId: string,
  types: ContactTypeStatus[],
): string | undefined {
  return types.find((type) => type.STATUS_ID === typeId)?.NAME;
}

export function buildPartnersContactFilter(
  typeIds: string[],
): Record<string, string[]> {
  return { '@TYPE_ID': typeIds };
}

export interface PartnersNosologyFilter {
  field: string;
  id: string;
  label?: string;
}

export function buildPartnersListPath(
  types: ContactTypeStatus[] = [],
  nosology?: PartnersNosologyFilter,
): string {
  const typeIds = resolvePartnerTypeIds(types);
  const params = new URLSearchParams();
  const labels = typeIds.map((typeId) => resolvePartnerTypeLabel(typeId, types));

  appendListFilterValues(params, 'TYPE_ID', typeIds, labels);

  if (nosology?.id) {
    appendListFilterValues(
      params,
      nosology.field,
      [nosology.id],
      [nosology.label],
      { forceIndexed: true },
    );
  }

  return `${CONTACT_LIST_PATH}?${params.toString()}`;
}

export function loadContactTypes(): Promise<ContactTypeStatus[]> {
  return new Promise((resolve, reject) => {
    const bx24 = getBx24();
    if (!bx24?.callMethod) {
      reject(new Error('BX24 API недоступен'));
      return;
    }

    bx24.callMethod(
      'crm.status.list',
      {
        order: { SORT: 'ASC' },
        filter: { ENTITY_ID: 'CONTACT_TYPE' },
      },
      (result) => {
        if (result.error()) {
          reject(result.error());
          return;
        }

        resolve((result.data() as ContactTypeStatus[]) ?? []);
      },
    );
  });
}

export async function getPartnerTypeIds(): Promise<string[]> {
  try {
    const allTypes = await loadContactTypes();
    return resolvePartnerTypeIds(allTypes);
  } catch (error) {
    console.warn('Не удалось загрузить тип «актуальный партнер», используем базовый фильтр:', error);
    return [...POTENTIAL_PARTNER_TYPE_IDS];
  }
}

function countContactsByFilter(filter: Record<string, string[]>): Promise<number> {
  return new Promise((resolve, reject) => {
    const bx24 = getBx24();
    if (!bx24?.callMethod) {
      reject(new Error('BX24 API недоступен'));
      return;
    }

    bx24.callMethod(
      'crm.contact.list',
      {
        filter,
        select: ['ID'],
      },
      (result) => {
        if (result.error()) {
          reject(result.error());
          return;
        }

        const total = result.total?.() ?? (result.data() as unknown[])?.length ?? 0;
        resolve(Number(total) || 0);
      },
    );
  });
}

export async function getPartnersCount(): Promise<number> {
  const typeIds = await getPartnerTypeIds();
  return countContactsByFilter(buildPartnersContactFilter(typeIds));
}

export async function openPartnersDirectory(
  nosology?: PartnersNosologyFilter,
): Promise<void> {
  let types: ContactTypeStatus[] = [];

  try {
    types = await loadContactTypes();
  } catch (error) {
    console.warn('Не удалось загрузить типы контактов для фильтра:', error);
  }

  openBitrixPath(buildPartnersListPath(types, nosology));
}

export async function openPartnersByNosology(
  nosologyId: string,
  nosologyLabel?: string,
  nosologyField: string = 'UF_CRM_1782832034',
): Promise<void> {
  await openPartnersDirectory({
    field: nosologyField,
    id: nosologyId,
    label: nosologyLabel,
  });
}

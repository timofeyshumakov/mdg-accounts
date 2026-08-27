import { appendCrmContactListFilter } from './bitrixListFilter';

/** Формирование договорённости. */
export const AGREEMENT_ENTITY_TYPE_ID = 1236;

export const AGREEMENT_LIST_PATH = `/crm/type/${AGREEMENT_ENTITY_TYPE_ID}/list/category/0/`;

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

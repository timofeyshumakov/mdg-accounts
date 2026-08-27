import { callBxMethod } from './bitrixApi';
import {
  CURRENT_STATUS_FIELD,
  INTEREST_FIELD,
  RELATION_STATUS_FIELD,
} from './monthlyReport';
import { NOSOLOGY_CONTACT_FIELD } from './nosologiesMetric';

export async function updateContactFields(
  contactId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await callBxMethod('crm.contact.update', {
    id: contactId,
    fields,
  });
}

export async function updateContactRelationStatus(
  contactId: string,
  statusId: string,
): Promise<void> {
  await updateContactFields(contactId, {
    [RELATION_STATUS_FIELD]: statusId || false,
  });
}

export async function updateContactCurrentStatus(
  contactId: string,
  statusId: string,
): Promise<void> {
  await updateContactFields(contactId, {
    [CURRENT_STATUS_FIELD]: statusId || false,
  });
}

export async function updateContactNosologies(
  contactId: string,
  nosologyIds: string[],
): Promise<void> {
  await updateContactFields(contactId, {
    [NOSOLOGY_CONTACT_FIELD]: nosologyIds.length ? nosologyIds : false,
  });
}

export async function updateContactInterest(
  contactId: string,
  interest: string,
): Promise<void> {
  await updateContactFields(contactId, {
    [INTEREST_FIELD]: interest || '',
  });
}

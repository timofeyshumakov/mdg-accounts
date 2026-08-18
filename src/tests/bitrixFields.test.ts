import { describe, expect, it } from 'vitest';
import { NOSOLOGY_CONTACT_FIELD } from '../features/crm/functions/nosologiesMetric';
import {
  buildContactListSelect,
  resolveApiFieldName,
} from '../features/crm/functions/bitrixFields';

describe('bitrixFields contact select', () => {
  it('uses upperName for crm.contact.list select', () => {
    expect(
      buildContactListSelect('ufCrm123Nosology', {
        upperName: 'UF_CRM_123_NOZ',
      }),
    ).toEqual(['ID', 'UF_CRM_123_NOZ', 'ufCrm123Nosology']);
  });

  it('keeps UF field name from userfield definition', () => {
    expect(
      resolveApiFieldName('UF_CRM_1756633452', {
        fieldName: 'UF_CRM_1756633452',
        upperName: 'UF_CRM_1756633452',
      }),
    ).toBe('UF_CRM_1756633452');
  });

  it('includes nosology field in crm.contact.list select', () => {
    expect(buildContactListSelect(NOSOLOGY_CONTACT_FIELD)).toEqual([
      'ID',
      NOSOLOGY_CONTACT_FIELD,
    ]);
  });
});

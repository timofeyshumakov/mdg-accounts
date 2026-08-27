import { describe, expect, it } from 'vitest';
import {
  AGREEMENT_ENTITY_TYPE_ID,
  buildAgreementListPath,
} from '../features/crm/functions/monthlyAgreement';
import { buildContactDetailsPath } from '../features/crm/functions/bitrixPath';

describe('monthlyAgreement / contact paths', () => {
  it('builds contact details path', () => {
    expect(buildContactDetailsPath('32610')).toBe('/crm/contact/details/32610/');
  });

  it('builds agreement list path filtered by contact', () => {
    const path = buildAgreementListPath('32610', 'Игорь Баранов');
    const query = new URLSearchParams(path.split('?')[1]);

    expect(AGREEMENT_ENTITY_TYPE_ID).toBe(1236);
    expect(path.startsWith('/crm/type/1236/list/category/0/')).toBe(true);
    expect(query.get('CONTACT_ID')).toBe('32610');
    expect(query.get('CONTACT_ID_label')).toBe('Игорь Баранов');
  });
});

import { describe, expect, it } from 'vitest';
import {
  ACTUAL_PARTNER_TYPE_NAME,
  buildPartnersContactFilter,
  buildPartnersListPath,
  POTENTIAL_PARTNER_TYPE_IDS,
  resolvePartnerTypeIds,
} from '../features/crm/functions/partnersDirectory';

describe('partnersDirectory', () => {
  const types = [
    { STATUS_ID: 'CLIENT', NAME: 'Клиенты' },
    { STATUS_ID: 'UC_TG1YCL', NAME: 'Потенциальный партнер' },
    { STATUS_ID: 'ACTUAL_PARTNER', NAME: ACTUAL_PARTNER_TYPE_NAME },
    { STATUS_ID: 'SUPPLIER', NAME: 'Поставщики' },
  ];

  it('includes hardcoded potential partner ids and actual partner from api', () => {
    expect(resolvePartnerTypeIds(types)).toEqual([
      ...POTENTIAL_PARTNER_TYPE_IDS,
      'ACTUAL_PARTNER',
    ]);
  });

  it('builds contact list path with indexed type filter', () => {
    const path = buildPartnersListPath(types);
    const query = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith('/crm/contact/list/?')).toBe(true);
    expect(query.get('apply_filter')).toBe('Y');
    expect(query.get('TYPE_ID[0]')).toBe('SUPPLIER');
    expect(query.get('TYPE_ID[1]')).toBe('UC_TG1YCL');
    expect(query.get('TYPE_ID[2]')).toBe('ACTUAL_PARTNER');
    expect(query.get('data[additional][TYPE_ID][0]')).toBe('SUPPLIER');
    expect(query.get('data[additional][TYPE_ID][1]')).toBe('UC_TG1YCL');
    expect(query.get('TYPE_ID_label[0]')).toBe('Поставщики');
  });

  it('uses only hardcoded ids when actual partner is missing', () => {
    expect(resolvePartnerTypeIds([])).toEqual([...POTENTIAL_PARTNER_TYPE_IDS]);
  });

  it('builds contact list api filter by partner type ids', () => {
    expect(buildPartnersContactFilter(resolvePartnerTypeIds(types))).toEqual({
      '@TYPE_ID': [...POTENTIAL_PARTNER_TYPE_IDS, 'ACTUAL_PARTNER'],
    });
  });

  it('builds contact list path with nosology filter', () => {
    const path = buildPartnersListPath(types, {
      field: 'UF_CRM_1782832034',
      id: '30944',
      label: 'Урология',
    }, ['32610', '32086']);
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.get('apply_filter')).toBe('Y');
    expect(query.get('TYPE_ID[0]')).toBe('SUPPLIER');
    expect(query.get('ID[0]')).toBe('32610');
    expect(query.get('ID[1]')).toBe('32086');
    expect(query.get('UF_CRM_1782832034[0]')).toBe('30944');
    expect(query.get('UF_CRM_1782832034_label[0]')).toBe('Урология');
    expect(query.get('data[additional][UF_CRM_1782832034][0]')).toBe('30944');
  });
});

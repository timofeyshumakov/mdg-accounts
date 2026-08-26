import { describe, expect, it } from 'vitest';
import { appendCrmContactListFilter, appendListFilterValues, buildCrmContactFilterValue } from '../features/crm/functions/bitrixListFilter';

describe('bitrixListFilter', () => {
  it('uses flat params for single filter value', () => {
    const params = new URLSearchParams();
    appendListFilterValues(params, 'TYPE_ID', ['SUPPLIER'], ['Поставщики']);

    expect(params.get('apply_filter')).toBe('Y');
    expect(params.get('TYPE_ID')).toBe('SUPPLIER');
    expect(params.get('TYPE_ID_label')).toBe('Поставщики');
  });

  it('uses indexed flat and additional params for multiple values', () => {
    const params = new URLSearchParams();
    appendListFilterValues(
      params,
      'TYPE_ID',
      ['SUPPLIER', 'UC_TG1YCL'],
      ['Поставщики', 'Потенциальный партнер'],
    );

    expect(params.get('TYPE_ID[0]')).toBe('SUPPLIER');
    expect(params.get('TYPE_ID[1]')).toBe('UC_TG1YCL');
    expect(params.get('data[additional][TYPE_ID][0]')).toBe('SUPPLIER');
    expect(params.get('TYPE_ID_label[1]')).toBe('Потенциальный партнер');
  });

  it('builds crm contact filter as plain numeric id', () => {
    expect(buildCrmContactFilterValue('42')).toBe('42');
  });

  it('builds smart process contact filter with label', () => {
    const params = new URLSearchParams();
    appendCrmContactListFilter(params, 'CONTACT_ID', '42', 'Иванов И.И.');

    expect(params.get('apply_filter')).toBe('Y');
    expect(params.get('CONTACT_ID')).toBe('42');
    expect(params.get('CONTACT_ID_label')).toBe('Иванов И.И.');
  });
});

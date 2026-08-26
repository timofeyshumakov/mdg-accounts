import { describe, expect, it } from 'vitest';
import {
  findContactUserFieldByLabel,
  userFieldToMeta,
} from '../features/crm/functions/bitrixFields';
import {
  aggregateNosologyCounts,
  buildLabelMapFromFieldDefinition,
  buildLabelMapFromIblockElements,
  countFieldElements,
  extractFieldValues,
  getNosologyIblockId,
  mapCountsToChartItems,
  NOSOLOGY_CONTACT_FIELD,
  NOSOLOGY_IBLOCK_ID,
} from '../features/crm/functions/nosologiesMetric';

describe('nosologiesMetric', () => {
  it('finds nosology field by userfield label', () => {
    expect(
      findContactUserFieldByLabel(
        [
          {
            FIELD_NAME: 'UF_CRM_111',
            LIST_FILTER_LABEL: 'Город',
          },
          {
            FIELD_NAME: 'UF_CRM_222',
            EDIT_FORM_LABEL: 'Нозология',
            LIST: [{ ID: '1', VALUE: 'Кардиология' }],
          },
        ],
        (label) => label.includes('нозолог'),
      )?.FIELD_NAME,
    ).toBe('UF_CRM_222');
  });

  it('builds label map from userfield definition', () => {
    const meta = userFieldToMeta({
      FIELD_NAME: 'UF_CRM_222',
      EDIT_FORM_LABEL: 'Нозология',
      LIST: [{ ID: '1', VALUE: 'Кардиология' }],
    });

    expect(buildLabelMapFromFieldDefinition(meta).get('1')).toBe('Кардиология');
  });

  it('uses known nosology contact field code', () => {
    expect(NOSOLOGY_CONTACT_FIELD).toBe('UF_CRM_1782832034');
    expect(NOSOLOGY_IBLOCK_ID).toBe(216);
  });

  it('resolves iblock id from iblock_element userfield settings', () => {
    expect(getNosologyIblockId({
      USER_TYPE_ID: 'iblock_element',
      SETTINGS: { IBLOCK_ID: 216 },
    })).toBe(216);

    expect(getNosologyIblockId({
      USER_TYPE_ID: 'enumeration',
    })).toBeNull();
  });

  it('builds label map from iblock list elements', () => {
    const labelMap = buildLabelMapFromIblockElements([
      { ID: '30944', NAME: 'Урология' },
      { ID: '30952', NAME: 'Онкология' },
    ]);

    expect(labelMap.get('30944')).toBe('Урология');
    expect(labelMap.get('30952')).toBe('Онкология');
  });

  it('aggregates iblock element ids into nosology names', () => {
    const labelMap = buildLabelMapFromIblockElements([
      { ID: '30944', NAME: 'Урология' },
      { ID: '30952', NAME: 'Онкология' },
    ]);

    const contacts = [
      { [NOSOLOGY_CONTACT_FIELD]: [30944, 30952] },
      { [NOSOLOGY_CONTACT_FIELD]: [30944] },
    ];

    const counts = aggregateNosologyCounts(
      contacts,
      NOSOLOGY_CONTACT_FIELD,
    );

    expect(mapCountsToChartItems(counts, labelMap)).toEqual([
      { id: '30944', label: 'Урология', value: 2 },
      { id: '30952', label: 'Онкология', value: 1 },
    ]);
  });

  it('extracts multi-value field items', () => {
    expect(extractFieldValues(['1', '2', '3'])).toEqual(['1', '2', '3']);
    expect(extractFieldValues([{ ID: '1' }, { ID: '2' }])).toEqual(['1', '2']);
    expect(extractFieldValues('1|2|3')).toEqual(['1', '2', '3']);
    expect(countFieldElements(null)).toBe(0);
    expect(countFieldElements(['1', '', null])).toBe(1);
  });

  it('counts total nosology elements across partner contacts', () => {
    const contacts = [
      { [NOSOLOGY_CONTACT_FIELD]: ['1', '2'] },
      { [NOSOLOGY_CONTACT_FIELD]: ['3'] },
      { [NOSOLOGY_CONTACT_FIELD]: ['4', '5', '6'] },
      { [NOSOLOGY_CONTACT_FIELD]: null },
    ];

    const total = contacts.reduce(
      (sum, contact) => sum + countFieldElements(contact[NOSOLOGY_CONTACT_FIELD]),
      0,
    );

    expect(total).toBe(6);
  });

  it('aggregates occurrences of each nosology among contacts', () => {
    const labelMap = buildLabelMapFromFieldDefinition({
      items: [
        { ID: '1', VALUE: 'Кардиология' },
        { ID: '2', VALUE: 'Онкология' },
      ],
    });

    const contacts = [
      { UF_CRM_NOZ: ['1', '2'] },
      { UF_CRM_NOZ: ['1'] },
      { UF_CRM_NOZ: ['2', '2'] },
    ];

    const counts = aggregateNosologyCounts(contacts, 'UF_CRM_NOZ');

    expect(mapCountsToChartItems(counts, labelMap)).toEqual([
      { id: '2', label: 'Онкология', value: 3 },
      { id: '1', label: 'Кардиология', value: 2 },
    ]);
  });
});

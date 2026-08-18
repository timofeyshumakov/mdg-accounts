import { describe, expect, it } from 'vitest';
import {
  aggregatePartnerCollectedSums,
  buildEventListSelect,
  buildPartnerEventsListPath,
  EVENT_COLLECTED_SUM_FIELD,
  EVENT_COLLECTED_SUM_FIELD_CAMEL,
  EVENT_PARTNER_FIELD,
  EVENT_PARTNER_FIELD_UPPER,
  findEventCollectedSumField,
  findEventPartnerField,
  formatContactName,
  getEventCollectedSumValue,
  getEventPartnerValue,
  parseMoneyValue,
} from '../features/crm/functions/partnersPotentialChart';

describe('partnersPotentialChart', () => {
  const portalFields = {
    contactId: { title: 'Контакт', type: 'crm_contact', upperName: 'CONTACT_ID' },
    ufCrm38_1756819315: { title: 'Собрано', type: 'crm' },
    [EVENT_COLLECTED_SUM_FIELD_CAMEL]: { title: 'Собранная сумма', type: 'money' },
    title: { title: 'Название', type: 'string' },
  };

  it('uses portal partner and collected sum field codes', () => {
    expect(EVENT_PARTNER_FIELD).toBe('contactId');
    expect(EVENT_PARTNER_FIELD_UPPER).toBe('CONTACT_ID');
    expect(EVENT_COLLECTED_SUM_FIELD).toBe('UF_CRM_38_1750949359532');
    expect(EVENT_COLLECTED_SUM_FIELD_CAMEL).toBe('ufCrm38_1750949359532');
  });

  it('finds contactId and money collected sum on events', () => {
    expect(findEventPartnerField(portalFields)).toBe('contactId');
    expect(findEventCollectedSumField(portalFields)).toBe(EVENT_COLLECTED_SUM_FIELD_CAMEL);
  });

  it('includes contact and collected sum in crm.item.list select', () => {
    expect(buildEventListSelect()).toEqual([
      'id',
      'title',
      EVENT_PARTNER_FIELD,
      EVENT_PARTNER_FIELD_UPPER,
      EVENT_COLLECTED_SUM_FIELD,
      EVENT_COLLECTED_SUM_FIELD_CAMEL,
    ]);
  });

  it('parses bitrix money values', () => {
    expect(parseMoneyValue('150000|RUB')).toBe(150000);
    expect(parseMoneyValue(4200)).toBe(4200);
    expect(parseMoneyValue(null)).toBe(0);
  });

  it('reads collected sum from event item in both field name formats', () => {
    expect(getEventCollectedSumValue({
      [EVENT_COLLECTED_SUM_FIELD_CAMEL]: '300|RUB',
    })).toBe('300|RUB');
    expect(getEventCollectedSumValue({
      [EVENT_COLLECTED_SUM_FIELD]: '300|RUB',
    })).toBe('300|RUB');
  });

  it('aggregates collected sums by contactId across events', () => {
    const events = [
      { id: 138, contactId: 32306, [EVENT_COLLECTED_SUM_FIELD_CAMEL]: '350000|RUB' },
      { id: 140, contactId: 32140, [EVENT_COLLECTED_SUM_FIELD_CAMEL]: '1170000|RUB' },
      { id: 141, contactId: 32140, [EVENT_COLLECTED_SUM_FIELD_CAMEL]: '500000|RUB' },
    ];

    expect(getEventPartnerValue(events[0])).toBe(32306);

    const totals = aggregatePartnerCollectedSums(events);

    expect(Object.fromEntries(totals)).toEqual({
      '32140': 1670000,
      '32306': 350000,
    });
  });

  it('formats contact name for chart labels', () => {
    expect(
      formatContactName({
        ID: '1',
        LAST_NAME: 'Иванов',
        NAME: 'Иван',
        SECOND_NAME: 'Иванович',
      }),
    ).toBe('Иванов Иван Иванович');
  });

  it('builds filtered events list path for contact partner', () => {
    const path = buildPartnerEventsListPath(
      EVENT_PARTNER_FIELD,
      '42',
      'Иванов И.И.',
      { upperName: EVENT_PARTNER_FIELD_UPPER },
    );
    const query = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith('/page/meropriyatiya/baoqgd/type/1052/list/?')).toBe(true);
    expect(query.get('apply_filter')).toBe('Y');
    expect(query.get('CONTACT_ID')).toBe('42');
    expect(query.get('CONTACT_ID_label')).toBe('Иванов И.И.');
    expect(query.get('contactId')).toBe('42');
    expect(query.get('data[additional][CONTACT_ID][0]')).toBe('42');
    expect(query.get('data[additional][CONTACT_ID_label][0]')).toBe('Иванов И.И.');
  });
});

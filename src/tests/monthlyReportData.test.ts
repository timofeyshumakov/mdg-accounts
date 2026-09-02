import { describe, expect, it } from 'vitest';
import {
  filterMonthlyReportRows,
  filterMonthlyReportRowsForChipCounts,
  recountChips,
  type MonthlyChipOption,
  type MonthlyReportRow,
} from '../features/crm/mock/monthlyReportData';

const sampleRows: MonthlyReportRow[] = [
  {
    id: '1',
    partnerName: 'Иванов Иван Иванович',
    organization: 'ООО «Ромашка»',
    nosologies: 'Хирургия',
    nosologyIds: ['1'],
    relationStatus: 'Новый',
    relationStatusId: 'new',
    interest: 'Региональный лидер',
    agreementLink: '#',
    ourEventsLink: '#',
    competitorEventsLink: '#',
    calls: 1,
    emails: 0,
    meetings: 2,
    touches: [],
    currentStatus: 'Думает',
    currentStatusId: 'thinking',
    comment: '',
    nextStep: '',
    tasks: 0,
    taskIds: [],
    taskItems: [],
    tasksLink: '#',
    companyId: '',
    partnerTypeId: 'new',
    assignedId: '10',
    month: 8,
    year: '2026',
  },
  {
    id: '2',
    partnerName: 'Петрова Анна',
    organization: 'АО «Медлайн»',
    nosologies: 'Онкология',
    nosologyIds: ['2'],
    relationStatus: 'Хороший',
    relationStatusId: 'good',
    interest: '',
    agreementLink: '#',
    ourEventsLink: '#',
    competitorEventsLink: '#',
    calls: 0,
    emails: 1,
    meetings: 0,
    touches: [],
    currentStatus: 'Готов',
    currentStatusId: 'ready',
    comment: '',
    nextStep: '',
    tasks: 0,
    taskIds: [],
    taskItems: [],
    tasksLink: '#',
    companyId: '',
    partnerTypeId: 'active',
    assignedId: '11',
    month: 8,
    year: '2026',
  },
];

const partnerTypeChips: MonthlyChipOption[] = [
  { id: 'active', label: 'Действующие партнеры', count: 0 },
  { id: 'new', label: 'Новые партнеры', count: 0 },
];

describe('monthlyReportData', () => {
  it('filters rows by search and partner type', () => {
    const rows = filterMonthlyReportRows(sampleRows, {
      search: 'ромашка',
      assignedIds: [],
      months: [],
      years: [],
      partnerTypes: ['new'],
      relationStatuses: [],
      currentStatuses: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].partnerName).toContain('Иванов');
  });

  it('recounts partner type chips from rows', () => {
    const chips = recountChips(sampleRows, partnerTypeChips, 'partnerTypeId');
    expect(chips.find((chip) => chip.id === 'new')?.count).toBe(1);
    expect(chips.find((chip) => chip.id === 'active')?.count).toBe(1);
  });

  it('recounts chips with cross-filters excluding own group', () => {
    const params = {
      search: '',
      assignedIds: ['10'],
      months: [],
      years: [],
      partnerTypes: ['active'],
      relationStatuses: [],
      currentStatuses: [],
    };
    const filtered = filterMonthlyReportRowsForChipCounts(sampleRows, params, 'partnerTypes');
    const chips = recountChips(filtered, partnerTypeChips, 'partnerTypeId');
    expect(chips.find((chip) => chip.id === 'new')?.count).toBe(1);
    expect(chips.find((chip) => chip.id === 'active')?.count).toBe(0);
  });
});

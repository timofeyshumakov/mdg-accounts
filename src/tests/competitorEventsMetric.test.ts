import { describe, expect, it } from 'vitest';
import {
  findCompetitorEventsEntityTypeId,
} from '../features/crm/functions/competitorEventsMetric';

describe('competitorEventsMetric', () => {
  it('finds competitor events smart process by title', () => {
    expect(
      findCompetitorEventsEntityTypeId([
        { entityTypeId: 1052, title: 'Мероприятия' },
        { entityTypeId: 1288, title: 'Мероприятия конкурентов' },
      ]),
    ).toBe(1288);
  });

  it('matches partial title when exact title differs', () => {
    expect(
      findCompetitorEventsEntityTypeId([
        { entityTypeId: 1301, title: 'Конкурентные мероприятия' },
      ]),
    ).toBe(1301);
  });
});

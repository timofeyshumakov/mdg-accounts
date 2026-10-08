import { describe, expect, it } from 'vitest';
import {
  buildOurEventsInProgressFilter,
  findOurEventsEntityTypeId,
  isOurEventInProgress,
  OUR_EVENTS_ENTITY_TYPE_ID,
  OUR_EVENTS_SMART_PROCESS_ID,
  OUR_EVENTS_STAGE_SEMANTIC_IN_PROGRESS,
  OUR_EVENTS_TYPE_TITLE,
} from '../features/crm/functions/ourEventsMetric';

describe('ourEventsMetric', () => {
  it('uses events smart process metadata from portal', () => {
    expect(OUR_EVENTS_SMART_PROCESS_ID).toBe(38);
    expect(OUR_EVENTS_ENTITY_TYPE_ID).toBe(1052);
    expect(OUR_EVENTS_TYPE_TITLE).toBe('мероприятия');
  });

  it('finds events entity type id by title or known id', () => {
    expect(findOurEventsEntityTypeId([
      { entityTypeId: 1288, title: 'Мероприятия конкурентов' },
      { entityTypeId: 1052, title: 'Мероприятия' },
    ])).toBe(1052);

    expect(findOurEventsEntityTypeId([
      { entityTypeId: 1052, title: 'Events' },
    ])).toBe(1052);
  });

  it('builds in-progress stage group filter', () => {
    expect(buildOurEventsInProgressFilter({ contactId: 1 })).toEqual({
      stageSemanticId: OUR_EVENTS_STAGE_SEMANTIC_IN_PROGRESS,
      contactId: 1,
    });
    expect(isOurEventInProgress({ stageSemanticId: 'P' })).toBe(true);
    expect(isOurEventInProgress({ STAGE_SEMANTIC_ID: 'S' })).toBe(false);
  });
});

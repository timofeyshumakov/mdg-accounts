import { describe, expect, it } from 'vitest';
import { buildOurEventsListPath, NAV_EXTERNAL_PATHS } from '../features/crm/functions/crmNavigation';
import { OUR_EVENTS_STAGE_SEMANTIC_IN_PROGRESS } from '../features/crm/functions/ourEventsMetric';

describe('crmNavigation', () => {
  it('defines external navigation paths', () => {
    expect(NAV_EXTERNAL_PATHS.tasks).toBe('/workgroups/group/1314/tasks/');
    expect(NAV_EXTERNAL_PATHS['our-events']).toBe('/page/meropriyatiya/baoqgd/');
    expect(NAV_EXTERNAL_PATHS['potential-partners']).toBe(
      '/crm/type/1236/kanban/category/0/',
    );
    expect(NAV_EXTERNAL_PATHS['competitor-events']).toBe(
      '/crm/type/1210/list/category/0/',
    );
  });

  it('builds our events list path with in-progress stage group filter', () => {
    const path = buildOurEventsListPath(1052);
    const [base, queryString = ''] = path.split('?');
    const query = new URLSearchParams(queryString);

    expect(base).toBe('/page/meropriyatiya/baoqgd/type/1052/list/');
    expect(query.get('apply_filter')).toBe('Y');
    expect(query.get('STAGE_SEMANTIC_ID')).toBe(OUR_EVENTS_STAGE_SEMANTIC_IN_PROGRESS);
    expect(query.get('STAGE_SEMANTIC_ID_label')).toBe('В работе');
  });

  it('can build our events list path without stage filter', () => {
    expect(buildOurEventsListPath(1052, { inProgressOnly: false })).toBe(
      '/page/meropriyatiya/baoqgd/type/1052/list/',
    );
  });
});

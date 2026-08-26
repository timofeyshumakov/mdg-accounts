import { describe, expect, it } from 'vitest';
import { buildOurEventsListPath, NAV_EXTERNAL_PATHS } from '../features/crm/functions/crmNavigation';

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

  it('builds our events list path in custom section', () => {
    expect(buildOurEventsListPath(1052)).toBe('/page/meropriyatiya/baoqgd/type/1052/list/');
  });
});

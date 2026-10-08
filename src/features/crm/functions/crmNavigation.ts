import type { NavItem } from '../mock/dashboardData';
import { openBitrixPath } from './bitrixPath';
import { runWhenBx24Ready } from './bitrixReady';
import {
  OUR_EVENTS_ENTITY_TYPE_ID,
  OUR_EVENTS_STAGE_SEMANTIC_IN_PROGRESS,
} from './ourEventsMetric';
import { openOrganizationsDirectory } from './organizationsDirectory';
import { openPartnersDirectory } from './partnersDirectory';

export const NAV_EXTERNAL_PATHS = {
  'our-events': '/page/meropriyatiya/baoqgd/',
  'competitor-events': '/crm/type/1210/list/category/0/',
  'potential-partners': '/crm/type/1236/kanban/category/0/',
  tasks: '/workgroups/group/1314/tasks/',
} as const;

/** Раздел «Мероприятия» в пользовательском разделе CRM. */
export const OUR_EVENTS_PAGE_PATH = NAV_EXTERNAL_PATHS['our-events'];

/** URL-параметры фильтра «Группа стадий: В работе». */
export function appendOurEventsInProgressStageFilter(params: URLSearchParams): void {
  params.set('apply_filter', 'Y');
  params.set('STAGE_SEMANTIC_ID', OUR_EVENTS_STAGE_SEMANTIC_IN_PROGRESS);
  params.set('STAGE_SEMANTIC_ID_label', 'В работе');
}

export function buildOurEventsListPath(
  entityTypeId: number = OUR_EVENTS_ENTITY_TYPE_ID,
  options: { inProgressOnly?: boolean } = { inProgressOnly: true },
): string {
  const base = `${OUR_EVENTS_PAGE_PATH}type/${entityTypeId}/list/`;
  if (options.inProgressOnly === false) {
    return base;
  }

  const params = new URLSearchParams();
  appendOurEventsInProgressStageFilter(params);
  return `${base}?${params.toString()}`;
}

export type ExternalNavId = keyof typeof NAV_EXTERNAL_PATHS;

export async function handleNavNavigation(
  item: NavItem,
): Promise<'handled' | 'default'> {
  if (item.id === 'partners') {
    await runWhenBx24Ready(openPartnersDirectory);
    return 'handled';
  }

  if (item.id === 'organizations') {
    openOrganizationsDirectory();
    return 'handled';
  }

  if (item.id === 'our-events') {
    openBitrixPath(buildOurEventsListPath(OUR_EVENTS_ENTITY_TYPE_ID));
    return 'handled';
  }

  const path = NAV_EXTERNAL_PATHS[item.id as ExternalNavId];
  if (path) {
    openBitrixPath(path);
    return 'handled';
  }

  return 'default';
}

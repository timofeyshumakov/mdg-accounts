import { openBitrixPath } from './bitrixPath';
import { appendListFilterValues } from './bitrixListFilter';

export const ORGANIZATION_COMPANY_TYPE_IDS = ['UC_QK9PY8', 'UC_J6Y6YO'] as const;

const COMPANY_LIST_PATH = '/crm/company/list/';

export function buildOrganizationsListPath(
  companyTypeIds: readonly string[] = ORGANIZATION_COMPANY_TYPE_IDS,
): string {
  const params = new URLSearchParams();
  appendListFilterValues(params, 'COMPANY_TYPE', [...companyTypeIds]);

  return `${COMPANY_LIST_PATH}?${params.toString()}`;
}

export function openOrganizationsDirectory(): void {
  openBitrixPath(buildOrganizationsListPath());
}

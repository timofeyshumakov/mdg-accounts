import { describe, expect, it } from 'vitest';
import {
  buildOrganizationsListPath,
  ORGANIZATION_COMPANY_TYPE_IDS,
} from '../features/crm/functions/organizationsDirectory';

describe('organizationsDirectory', () => {
  it('builds company list path with indexed company type filter', () => {
    const path = buildOrganizationsListPath();
    const query = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith('/crm/company/list/?')).toBe(true);
    expect(query.get('apply_filter')).toBe('Y');
    expect(query.get('COMPANY_TYPE[0]')).toBe(
      ORGANIZATION_COMPANY_TYPE_IDS[0],
    );
    expect(query.get('COMPANY_TYPE[1]')).toBe(
      ORGANIZATION_COMPANY_TYPE_IDS[1],
    );
    expect(query.get('data[additional][COMPANY_TYPE][0]')).toBe(
      ORGANIZATION_COMPANY_TYPE_IDS[0],
    );
  });
});

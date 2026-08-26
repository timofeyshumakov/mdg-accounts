export function appendListFilterValues(
  params: URLSearchParams,
  field: string,
  values: string[],
  labels: Array<string | undefined> = [],
  options: { forceIndexed?: boolean } = {},
): void {
  params.set('apply_filter', 'Y');

  if (values.length === 1 && !options.forceIndexed) {
    params.set(field, values[0]);
    if (labels[0]) {
      params.set(`${field}_label`, labels[0]);
    }
    return;
  }

  values.forEach((value, index) => {
    const label = labels[index];

    params.set(`${field}[${index}]`, value);
    params.set(`data[additional][${field}][${index}]`, value);

    if (label) {
      params.set(`${field}_label[${index}]`, label);
      params.set(`data[additional][${field}_label][${index}]`, label);
    }
  });
}

/** Числовой id контакта для URL-фильтра списка CRM. */
export function buildCrmContactFilterValue(contactId: string): string {
  const id = Number(contactId);
  return String(Number.isFinite(id) ? id : contactId);
}

export function appendCrmContactListFilter(
  params: URLSearchParams,
  filterKey: string,
  contactId: string,
  label?: string,
): void {
  params.set('apply_filter', 'Y');
  params.set(filterKey, buildCrmContactFilterValue(contactId));

  if (label) {
    params.set(`${filterKey}_label`, label);
  }
}

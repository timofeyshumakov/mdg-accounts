export function appendListFilterValues(
  params: URLSearchParams,
  field: string,
  values: string[],
  labels: Array<string | undefined> = [],
): void {
  params.set('apply_filter', 'Y');

  if (values.length === 1) {
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

/** JSON-значение фильтра по контакту в списке CRM (как у сделок по мероприятию в detail-report). */
export function buildCrmContactFilterValue(contactId: string): string {
  const id = Number(contactId);
  const normalizedId = Number.isFinite(id) ? id : contactId;

  return JSON.stringify({ CONTACT: [normalizedId] });
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

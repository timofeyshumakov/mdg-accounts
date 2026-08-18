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

/** Фильтр по полю-ссылке на CRM-сущность в списке смарт-процесса. */
export function appendCrmEntityListFilter(
  params: URLSearchParams,
  fieldName: string,
  upperName: string,
  value: string,
  label?: string,
): void {
  params.set('apply_filter', 'Y');

  const keys = [...new Set([fieldName, upperName].filter(Boolean))];

  keys.forEach((key) => {
    params.set(key, value);
    params.set(`${key}[0]`, value);
    params.set(`data[additional][${key}][0]`, value);

    if (label) {
      params.set(`${key}_label`, label);
      params.set(`${key}_label[0]`, label);
      params.set(`data[additional][${key}_label][0]`, label);
    }
  });
}

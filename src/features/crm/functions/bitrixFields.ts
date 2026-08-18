export interface NamedCrmField {
  title?: string;
  listLabel?: string;
  formLabel?: string;
  filterLabel?: string;
  listColumnLabel?: string;
  fieldName?: string;
  type?: string;
  upperName?: string;
  isMultiple?: boolean;
  items?: Array<{ ID?: string | number; VALUE?: string; id?: string | number; value?: string }>
    | Record<string, { ID?: string | number; VALUE?: string; id?: string | number; value?: string }>;
  LIST?: Array<{ ID?: string | number; VALUE?: string }>;
}

export interface ContactUserFieldRecord {
  FIELD_NAME?: string;
  LIST_FILTER_LABEL?: string;
  EDIT_FORM_LABEL?: string;
  LIST_COLUMN_LABEL?: string;
  USER_TYPE_ID?: string;
  MULTIPLE?: string;
  LIST?: Array<{ ID?: string | number; VALUE?: string }>;
  SETTINGS?: {
    IBLOCK_ID?: number | string;
  };
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function unwrapFieldsResponse<T extends Record<string, unknown>>(
  raw: unknown,
): T {
  if (!raw || typeof raw !== 'object') {
    return {} as T;
  }

  if ('fields' in raw && raw.fields && typeof raw.fields === 'object') {
    return raw.fields as T;
  }

  return raw as T;
}

export function getFieldLabel(field?: NamedCrmField | ContactUserFieldRecord | null): string {
  if (!field) {
    return '';
  }

  const named = field as NamedCrmField;
  const userField = field as ContactUserFieldRecord;

  return named.title
    ?? named.listLabel
    ?? named.formLabel
    ?? named.filterLabel
    ?? named.listColumnLabel
    ?? userField.LIST_FILTER_LABEL
    ?? userField.EDIT_FORM_LABEL
    ?? userField.LIST_COLUMN_LABEL
    ?? '';
}

export function findFieldByLabel(
  fields: Record<string, NamedCrmField>,
  matcher: (label: string) => boolean,
): string | null {
  for (const [name, field] of Object.entries(fields)) {
    const label = normalizeLabel(getFieldLabel(field));
    if (label && matcher(label)) {
      return name;
    }
  }

  return null;
}

export function findContactUserFieldByLabel(
  fields: ContactUserFieldRecord[],
  matcher: (label: string) => boolean,
): ContactUserFieldRecord | null {
  for (const field of fields) {
    const label = normalizeLabel(getFieldLabel(field));
    if (label && matcher(label)) {
      return field;
    }
  }

  return null;
}

export function userFieldToMeta(
  field: ContactUserFieldRecord,
): NamedCrmField {
  const fieldName = field.FIELD_NAME ?? '';

  return {
    title: getFieldLabel(field),
    fieldName,
    upperName: fieldName,
    isMultiple: field.MULTIPLE === 'Y',
    items: field.LIST,
    LIST: field.LIST,
  };
}

export function resolveApiFieldName(
  fieldName: string,
  field?: NamedCrmField | null,
): string {
  return field?.upperName
    ?? field?.fieldName
    ?? (fieldName.startsWith('UF_') ? fieldName : fieldName.toUpperCase());
}

export function buildContactListSelect(
  fieldName: string,
  field?: NamedCrmField | null,
): string[] {
  const apiFieldName = resolveApiFieldName(fieldName, field);

  return [...new Set(['ID', apiFieldName, fieldName, field?.upperName, field?.fieldName].filter(
    (value): value is string => Boolean(value),
  ))];
}

export function getFieldLookupKeys(
  fieldName: string,
  field?: NamedCrmField | null,
): string[] {
  return [...new Set(
    [fieldName, field?.upperName, field?.fieldName, fieldName.toUpperCase(), fieldName.toLowerCase()]
      .filter((value): value is string => Boolean(value)),
  )];
}

export function buildCrmItemListSelect(
  fields: Array<{ name: string; meta?: NamedCrmField | null }>,
  base: string[] = ['id', 'title'],
): string[] {
  const select = new Set(base);

  fields.forEach(({ name, meta }) => {
    [name, meta?.upperName, meta?.fieldName, resolveApiFieldName(name, meta)]
      .filter((value): value is string => Boolean(value))
      .forEach((value) => select.add(value));
  });

  return [...select];
}

export function getRecordFieldValue(
  record: Record<string, unknown>,
  fieldName: string,
  field?: NamedCrmField | null,
): unknown {
  for (const key of getFieldLookupKeys(fieldName, field)) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  return undefined;
}

export function extractEntityIds(value: unknown): string[] {
  if (value == null || value === '' || value === false) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractEntityIds(item));
  }

  if (typeof value === 'object') {
    const entity = value as Record<string, unknown>;
    if (entity.id != null && entity.id !== '') {
      return [String(entity.id)];
    }
    if (entity.ID != null && entity.ID !== '') {
      return [String(entity.ID)];
    }
    if (entity.contactId != null && entity.contactId !== '') {
      return [String(entity.contactId)];
    }
    if (entity.CONTACT_ID != null && entity.CONTACT_ID !== '') {
      return [String(entity.CONTACT_ID)];
    }
    if (entity.value != null && entity.value !== '') {
      return [String(entity.value)];
    }
  }

  if (typeof value === 'number') {
    return value > 0 ? [String(value)] : [];
  }

  return [String(value)];
}

export function extractScalarValues(value: unknown): string[] {
  if (value == null || value === '' || value === false) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => extractScalarValues(item))
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    const entity = value as Record<string, unknown>;
    if (entity.value != null && entity.value !== '') {
      return [String(entity.value)];
    }
    if (entity.id != null && entity.id !== '') {
      return [String(entity.id)];
    }
    if (entity.ID != null && entity.ID !== '') {
      return [String(entity.ID)];
    }
  }

  return [String(value)];
}

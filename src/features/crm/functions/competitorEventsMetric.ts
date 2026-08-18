import { callBxMethod, countCrmItems } from './bitrixApi';

export const COMPETITOR_EVENTS_TYPE_TITLE = 'мероприятия конкурентов';

export interface CrmType {
  entityTypeId: number;
  title: string;
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function extractCrmTypes(
  raw: { types?: CrmType[] } | CrmType[] | null | undefined,
): CrmType[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  return raw?.types ?? [];
}

export function findCompetitorEventsEntityTypeId(
  types: CrmType[],
): number | null {
  const normalizedTypes = types.map((type) => ({
    ...type,
    normalizedTitle: normalizeTitle(type.title ?? ''),
  }));

  const exactMatch = normalizedTypes.find(
    (type) => type.normalizedTitle === normalizeTitle(COMPETITOR_EVENTS_TYPE_TITLE),
  );
  if (exactMatch) {
    return exactMatch.entityTypeId;
  }

  const partialMatch = normalizedTypes.find(
    (type) =>
      type.normalizedTitle.includes('мероприят')
      && type.normalizedTitle.includes('конкурент'),
  );

  return partialMatch?.entityTypeId ?? null;
}

async function resolveCompetitorEventsEntityTypeId(): Promise<number> {
  const raw = await callBxMethod<{ types?: CrmType[] } | CrmType[]>(
    'crm.type.list',
    { order: { id: 'ASC' } },
  );
  const entityTypeId = findCompetitorEventsEntityTypeId(extractCrmTypes(raw));

  if (!entityTypeId) {
    throw new Error('Смарт-процесс «Мероприятия конкурентов» не найден');
  }

  return entityTypeId;
}

export async function getCompetitorEventsCount(): Promise<number> {
  const entityTypeId = await resolveCompetitorEventsEntityTypeId();
  return countCrmItems(entityTypeId);
}

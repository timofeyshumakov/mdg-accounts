import { callBxMethod, fetchAllCrmItems } from './bitrixApi';
import { extractScalarValues } from './bitrixFields';
import { appendCrmContactListFilter } from './bitrixListFilter';
import { loadUserDisplaysByIds, type UserDisplay } from './userDisplay';
import {
  formatReportPeriodLabel,
  type MonthlyReportPeriod,
} from './monthlyReportSubmit';

/** Смарт-процесс «Резюме месяца». */
export const MONTHLY_SUMMARY_ENTITY_TYPE_ID = 1278;

/** Смарт-процесс «План по контактам». */
export const MONTHLY_PLAN_ENTITY_TYPE_ID = 1262;

/** Поля записи «План по контактам» (смарт-процесс 1262). */
export const PLAN_FIELDS = {
  month: 'ufCrm142_1788250973482',
  monthUpper: 'UF_CRM_142_1788250973482',
  direction: 'ufCrm142_1788251039137',
  directionUpper: 'UF_CRM_142_1788251039137',
  goal: 'ufCrm142_1788251088136',
  goalUpper: 'UF_CRM_142_1788251088136',
  currentStatus: 'ufCrm142_1788251137871',
  currentStatusUpper: 'UF_CRM_142_1788251137871',
  nextStep: 'ufCrm142_1788251174043',
  nextStepUpper: 'UF_CRM_142_1788251174043',
  priority: 'ufCrm142_1788251209245',
  priorityUpper: 'UF_CRM_142_1788251209245',
} as const;

/** Смарт-процесс «Боли и предложения по улучшению». */
export const MONTHLY_PAINS_ENTITY_TYPE_ID = 1266;

/** Поля записи «Боли и предложения» (смарт-процесс 1266). */
export const PAIN_FIELDS = {
  problem: 'ufCrm144_1788253116451',
  problemUpper: 'UF_CRM_144_1788253116451',
  impact: 'ufCrm144_1788253175552',
  impactUpper: 'UF_CRM_144_1788253175552',
  suggestion: 'ufCrm144_1788253196290',
  suggestionUpper: 'UF_CRM_144_1788253196290',
} as const;

/** Текстовые поля записи боли — для чтения по обоим вариантам имени. */
const PAIN_TEXT_FIELDS = {
  problem: [PAIN_FIELDS.problem, PAIN_FIELDS.problemUpper],
  impact: [PAIN_FIELDS.impact, PAIN_FIELDS.impactUpper],
  suggestion: [PAIN_FIELDS.suggestion, PAIN_FIELDS.suggestionUpper],
};

/** Поле «Месяц/период» в резюме (дата 1-го числа месяца). */
const SUMMARY_PERIOD_DATE_FIELDS = [
  'ufCrmSummaryPeriodDate',
  'ufCrmPlanPeriodDate',
  'ufCrmPeriodDate',
];

/** Текстовое резюме. */
const SUMMARY_TEXT_FIELDS = [
  'ufCrmSummaryText',
  'ufCrmSummary',
  'ufCrmReport',
  'ufCrmText',
];

export interface MonthlySummaryItem {
  id: string;
  title: string;
  text: string;
  assignedId: string;
  assignedName: string;
  /** Ссылка на фото ответственного (пусто, если нет). */
  assignedPhoto: string;
  created: string;
  periodDate: string;
}

export interface MonthlyPlanItem {
  id: string;
  title: string;
  text: string;
  assignedId: string;
  assignedName: string;
  /** Ссылка на фото ответственного (пусто, если нет). */
  assignedPhoto: string;
  created: string;
  /** Месяц плана (название варианта перечисления). */
  month: string;
  /** Направление / контакт. */
  direction: string;
  /** Цель. */
  goal: string;
  /** Текущий статус. */
  currentStatus: string;
  /** Следующий шаг. */
  nextStep: string;
  /** Приоритет (Высокий / Средний / Низкий). */
  priority: string;
}

export interface MonthlyPainItem {
  id: string;
  title: string;
  assignedId: string;
  assignedName: string;
  /** Ссылка на фото ответственного (пусто, если нет). */
  assignedPhoto: string;
  created: string;
  /** Боль / проблема. */
  problem: string;
  /** Как влияет на работу. */
  impact: string;
  /** Что предлагаю улучшить. */
  suggestion: string;
}

export function buildMonthlySummaryListPath(
  period?: MonthlyReportPeriod,
  contactId?: string,
  contactLabel?: string,
): string {
  const params = new URLSearchParams();
  if (contactId) {
    appendCrmContactListFilter(params, 'CONTACT_ID', contactId, contactLabel);
  } else if (period) {
    params.set('apply_filter', 'Y');
    const month = String(period.month).padStart(2, '0');
    params.set('>=CLOSEDATE', `${period.year}-${month}-01`);
    params.set('<=CLOSEDATE', `${period.year}-${month}-31`);
  }
  const query = params.toString();
  return `/crm/type/${MONTHLY_SUMMARY_ENTITY_TYPE_ID}/list/category/0/${query ? `?${query}` : ''}`;
}

export function buildMonthlySummaryDetailsPath(itemId: string | number): string {
  return `/crm/type/${MONTHLY_SUMMARY_ENTITY_TYPE_ID}/details/${itemId}/`;
}

/** Форма создания резюме месяца в Bitrix24 (details/0). */
export const MONTHLY_SUMMARY_CREATE_PATH =
  `/crm/type/${MONTHLY_SUMMARY_ENTITY_TYPE_ID}/details/0/`;

/** Форма создания плана по контактам в Bitrix24. */
export const MONTHLY_PLAN_CREATE_PATH =
  `/crm/type/${MONTHLY_PLAN_ENTITY_TYPE_ID}/details/0/`;

/** Форма создания записи «Боли и предложения» в Bitrix24. */
export const MONTHLY_PAINS_CREATE_PATH =
  `/crm/type/${MONTHLY_PAINS_ENTITY_TYPE_ID}/details/0/`;

export function buildMonthlyPlanListPath(): string {
  return `/crm/type/${MONTHLY_PLAN_ENTITY_TYPE_ID}/list/category/0/`;
}

export function buildMonthlyPlanDetailsPath(itemId: string | number): string {
  return `/crm/type/${MONTHLY_PLAN_ENTITY_TYPE_ID}/details/${itemId}/`;
}

function readTextField(item: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    for (const key of [field, field.replace('ufCrm', 'UF_CRM_')]) {
      const value = extractScalarValues(item[key])[0];
      if (value != null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  return '';
}

function readDateField(item: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    for (const key of [field, field.replace('ufCrm', 'UF_CRM_')]) {
      const value = extractScalarValues(item[key])[0];
      if (value != null && String(value).trim()) {
        return String(value).slice(0, 10);
      }
    }
  }
  return '';
}

function readAssignedId(item: Record<string, unknown>): string {
  const raw = item.assignedById ?? item.ASSIGNED_BY_ID ?? item.assignedBy?.id;
  return String(extractScalarValues(raw)[0] ?? '').trim();
}

function readCreated(item: Record<string, unknown>): string {
  const raw = item.createdTime ?? item.CREATED_TIME ?? item.dateCreate ?? '';
  const text = String(raw ?? '').trim();
  if (!text) {
    return '';
  }
  const date = new Date(text.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 10);
  }
  return date.toLocaleDateString('ru-RU');
}

/** Время создания в мс — для сортировки «сначала свежие». */
function readCreatedTime(item: Record<string, unknown>): number {
  const raw = String(item.createdTime ?? item.CREATED_TIME ?? item.dateCreate ?? '').trim();
  if (!raw) {
    return 0;
  }
  const time = new Date(raw.replace(' ', 'T')).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Дата создания (день) — для фильтра «создано в этом месяце». */
function readCreatedDay(item: Record<string, unknown>): string {
  const raw = String(item.createdTime ?? item.CREATED_TIME ?? item.dateCreate ?? '').trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/** Запись создана в выбранном месяце. */
export function isCreatedInPeriod(
  createdDay: string,
  period: MonthlyReportPeriod,
): boolean {
  const day = String(createdDay ?? '').trim();
  if (!day) {
    return false;
  }
  const month = String(period.month).padStart(2, '0');
  return day.startsWith(`${period.year}-${month}`);
}

async function attachUserNames(
  items: Array<{ assignedId: string }>,
): Promise<Map<string, UserDisplay>> {
  try {
    return await loadUserDisplaysByIds(items.map((item) => item.assignedId));
  } catch (error) {
    console.warn('Не удалось загрузить ответственных:', error);
    return new Map();
  }
}

/**
 * Названия вариантов поля-enumeration из crm.item.fields.
 * Нужно, чтобы в таблице выводились «октябрь» и «Высокий», а не 11938 и 11944.
 */
async function loadPlanEnumLabels(): Promise<Map<string, Map<string, string>>> {
  const byField = new Map<string, Map<string, string>>();

  try {
    const raw = await callBxMethod<{ fields?: Record<string, Record<string, unknown>> }>(
      'crm.item.fields',
      { entityTypeId: MONTHLY_PLAN_ENTITY_TYPE_ID, useOriginalUfNames: 'N' },
    );
    const fields = raw?.fields ?? {};

    [PLAN_FIELDS.month, PLAN_FIELDS.priority].forEach((fieldName) => {
      const field = fields[fieldName];
      const items = field?.items ?? field?.LIST;
      if (!items) {
        return;
      }
      const labels = new Map<string, string>();
      const list = Array.isArray(items) ? items : Object.values(items);
      list.forEach((entry) => {
        const record = entry as { ID?: string | number; id?: string | number; VALUE?: string; value?: string };
        const id = record?.ID ?? record?.id;
        const label = record?.VALUE ?? record?.value;
        if (id != null && id !== '' && label != null && String(label).trim()) {
          labels.set(String(id), String(label).trim());
        }
      });
      byField.set(fieldName, labels);
    });
  } catch (error) {
    console.warn('Не удалось загрузить перечисления плана по контактам:', error);
  }

  return byField;
}

/** Читает id перечисления и подставляет название, если оно известно. */
function readEnumLabel(
  item: Record<string, unknown>,
  field: string,
  labels: Map<string, string> | undefined,
): string {
  const raw = extractScalarValues(item[field])[0];
  if (raw == null || raw === '') {
    return '';
  }
  const id = String(raw).trim();
  return labels?.get(id) ?? '';
}

function mapPlanItem(item: Record<string, unknown>): MonthlyPlanItem {
  const assignedId = readAssignedId(item);
  return {
    id: String(item.id ?? item.ID ?? ''),
    title: String(item.title ?? item.TITLE ?? '').trim(),
    text: readTextField(item, SUMMARY_TEXT_FIELDS),
    assignedId,
    assignedName: '',
    assignedPhoto: '',
    created: readCreated(item),
    month: '',
    direction: readTextField(item, [PLAN_FIELDS.direction, PLAN_FIELDS.directionUpper]),
    goal: readTextField(item, [PLAN_FIELDS.goal, PLAN_FIELDS.goalUpper]),
    currentStatus: readTextField(item, [
      PLAN_FIELDS.currentStatus,
      PLAN_FIELDS.currentStatusUpper,
    ]),
    nextStep: readTextField(item, [PLAN_FIELDS.nextStep, PLAN_FIELDS.nextStepUpper]),
    priority: '',
  };
}

function mapSummaryItem(item: Record<string, unknown>): MonthlySummaryItem {
  const assignedId = readAssignedId(item);
  return {
    id: String(item.id ?? item.ID ?? ''),
    title: String(item.title ?? item.TITLE ?? '').trim(),
    text: readTextField(item, SUMMARY_TEXT_FIELDS),
    assignedId,
    assignedName: '',
    assignedPhoto: '',
    created: readCreated(item),
    periodDate: readDateField(item, SUMMARY_PERIOD_DATE_FIELDS),
  };
}

/** Резюме месяца, созданные в выбранном месяце. */
export async function loadMonthlySummaries(
  period: MonthlyReportPeriod,
): Promise<MonthlySummaryItem[]> {
  let items: Record<string, unknown>[] = [];

  try {
    items = await fetchAllCrmItems(
      MONTHLY_SUMMARY_ENTITY_TYPE_ID,
      null,
      {},
      { order: { createdTime: 'DESC' } },
    );
  } catch (error) {
    console.warn('Не удалось загрузить резюме месяца:', error);
    return [];
  }

  const mapped = items
    .filter((item) => isCreatedInPeriod(readCreatedDay(item), period))
    .map(mapSummaryItem)
    .sort((left, right) => readCreatedTime({ createdTime: right.created })
      - readCreatedTime({ createdTime: left.created }));

  const users = await attachUserNames(mapped);
  mapped.forEach((item) => {
    const user = users.get(item.assignedId);
    item.assignedName = user?.shortName ?? '';
    item.assignedPhoto = user?.photo ?? '';
  });

  return mapped;
}

/** План по контактам (смарт-процесс 1262). */
export async function loadMonthlyPlans(): Promise<MonthlyPlanItem[]> {
  let items: Record<string, unknown>[] = [];

  try {
    items = await fetchAllCrmItems(
      MONTHLY_PLAN_ENTITY_TYPE_ID,
      null,
      {},
      { order: { createdTime: 'DESC' } },
    );
  } catch (error) {
    console.warn('Не удалось загрузить план по контактам:', error);
    return [];
  }

  const [enumLabels, users] = await Promise.all([
    loadPlanEnumLabels(),
    attachUserNames(items.map((item) => ({ assignedId: readAssignedId(item) }))),
  ]);

  const monthLabels = enumLabels.get(PLAN_FIELDS.month);
  const priorityLabels = enumLabels.get(PLAN_FIELDS.priority);

  const mapped = items.map((item) => {
    const row = mapPlanItem(item);
    const user = users.get(row.assignedId);
    row.assignedName = user?.shortName ?? '';
    row.assignedPhoto = user?.photo ?? '';
    row.month = readEnumLabel(item, PLAN_FIELDS.month, monthLabels);
    row.priority = readEnumLabel(item, PLAN_FIELDS.priority, priorityLabels);
    return row;
  });

  return mapped;
}

function mapPainItem(item: Record<string, unknown>): MonthlyPainItem {
  return {
    id: String(item.id ?? item.ID ?? ''),
    title: String(item.title ?? item.TITLE ?? '').trim(),
    assignedId: readAssignedId(item),
    assignedName: '',
    assignedPhoto: '',
    created: readCreated(item),
    problem: readTextField(item, PAIN_TEXT_FIELDS.problem),
    impact: readTextField(item, PAIN_TEXT_FIELDS.impact),
    suggestion: readTextField(item, PAIN_TEXT_FIELDS.suggestion),
  };
}

/** Боли и предложения по улучшению (смарт-процесс 1266). */
export async function loadMonthlyPains(): Promise<MonthlyPainItem[]> {
  let items: Record<string, unknown>[] = [];

  try {
    items = await fetchAllCrmItems(
      MONTHLY_PAINS_ENTITY_TYPE_ID,
      null,
      {},
      { order: { createdTime: 'DESC' } },
    );
  } catch (error) {
    console.warn('Не удалось загрузить боли и предложения по улучшению:', error);
    return [];
  }

  const mapped = items.map(mapPainItem);

  const users = await attachUserNames(mapped);
  mapped.forEach((item) => {
    const user = users.get(item.assignedId);
    item.assignedName = user?.shortName ?? '';
    item.assignedPhoto = user?.photo ?? '';
  });

  return mapped;
}

/** Заготовка заголовка резюме: «Иванова Анна — 10.2026». */
export function buildSummaryTitle(
  assignedName: string,
  period: MonthlyReportPeriod,
): string {
  const name = String(assignedName || '').trim();
  const label = formatReportPeriodLabel(period);
  return name ? `${name} — ${label}` : `Резюме — ${label}`;
}

export interface CreateSummaryInput {
  title: string;
  text: string;
  assignedId?: string;
  period: MonthlyReportPeriod;
}

/** Создание элемента резюме месяца в SPA 1278. */
export async function createMonthlySummary(
  input: CreateSummaryInput,
): Promise<{ id: string }> {
  const fields: Record<string, unknown> = {
    title: input.title || buildSummaryTitle('', input.period),
  };

  if (input.text) {
    fields[SUMMARY_TEXT_FIELDS[0]] = input.text;
  }
  if (input.assignedId) {
    const numeric = Number(input.assignedId);
    fields.assignedById = Number.isFinite(numeric) ? numeric : input.assignedId;
  }

  const raw = await callBxMethod<{ item?: { id?: string | number }; id?: string | number }>(
    'crm.item.add',
    {
      entityTypeId: MONTHLY_SUMMARY_ENTITY_TYPE_ID,
      fields,
    },
  );

  const id = String(raw?.item?.id ?? raw?.id ?? '');
  if (!id) {
    throw new Error('Не удалось создать резюме месяца');
  }

  return { id };
}

/** Заготовка заголовка плана: «Иванова Анна — 10.2026». */
export function buildPlanTitle(
  assignedName: string,
  period: MonthlyReportPeriod,
): string {
  const name = String(assignedName || '').trim();
  const label = formatReportPeriodLabel(period);
  return name ? `${name} — ${label}` : `План по контактам — ${label}`;
}

export interface CreatePlanInput {
  title: string;
  text: string;
  assignedId?: string;
}

/** Создание элемента плана по контактам в SPA 1262. */
export async function createMonthlyPlan(
  input: CreatePlanInput,
): Promise<{ id: string }> {
  const fields: Record<string, unknown> = {
    title: input.title || 'План по контактам',
  };

  if (input.text) {
    fields[SUMMARY_TEXT_FIELDS[0]] = input.text;
  }
  if (input.assignedId) {
    const numeric = Number(input.assignedId);
    fields.assignedById = Number.isFinite(numeric) ? numeric : input.assignedId;
  }

  const raw = await callBxMethod<{ item?: { id?: string | number }; id?: string | number }>(
    'crm.item.add',
    {
      entityTypeId: MONTHLY_PLAN_ENTITY_TYPE_ID,
      fields,
    },
  );

  const id = String(raw?.item?.id ?? raw?.id ?? '');
  if (!id) {
    throw new Error('Не удалось создать план по контактам');
  }

  return { id };
}

export function buildMonthlyPainsListPath(): string {
  return `/crm/type/${MONTHLY_PAINS_ENTITY_TYPE_ID}/list/category/0/`;
}

export function buildMonthlyPainsDetailsPath(itemId: string | number): string {
  return `/crm/type/${MONTHLY_PAINS_ENTITY_TYPE_ID}/details/${itemId}/`;
}

/** Заготовка заголовка боли: «Иванова Анна — 10.2026». */
export function buildPainTitle(
  assignedName: string,
  period: MonthlyReportPeriod,
): string {
  const name = String(assignedName || '').trim();
  const label = formatReportPeriodLabel(period);
  return name ? `${name} — ${label}` : `Боли и предложения — ${label}`;
}

export interface CreatePainInput {
  title: string;
  text: string;
  assignedId?: string;
}

/** Создание элемента «Боли и предложения по улучшению» в SPA 1266. */
export async function createMonthlyPain(
  input: CreatePainInput,
): Promise<{ id: string }> {
  const fields: Record<string, unknown> = {
    title: input.title || 'Боли и предложения по улучшению',
  };

  if (input.text) {
    fields[SUMMARY_TEXT_FIELDS[0]] = input.text;
  }
  if (input.assignedId) {
    const numeric = Number(input.assignedId);
    fields.assignedById = Number.isFinite(numeric) ? numeric : input.assignedId;
  }

  const raw = await callBxMethod<{ item?: { id?: string | number }; id?: string | number }>(
    'crm.item.add',
    {
      entityTypeId: MONTHLY_PAINS_ENTITY_TYPE_ID,
      fields,
    },
  );

  const id = String(raw?.item?.id ?? raw?.id ?? '');
  if (!id) {
    throw new Error('Не удалось создать запись «Боли и предложения по улучшению»');
  }

  return { id };
}

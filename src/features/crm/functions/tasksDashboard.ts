import { callBxMethod, fetchAllContactList, fetchAllCrmItems, fetchAllPages } from './bitrixApi';
import { extractScalarValues } from './bitrixFields';
import { getBitrixPortalOrigin } from './bitrixPath';
import { OUR_EVENTS_ENTITY_TYPE_ID } from './ourEventsMetric';
import { OUR_EVENTS_STAGE_ENTITY_ID } from './monthlyEvents';
import { buildPartnersContactFilter, getPartnerTypeIds } from './partnersDirectory';
import { EVENTS_CRM_TASK_PREFIX, TASKS_PARTNERS_GROUP_ID } from './tasksGroup';

/** Группа задач «Отдел по работе с партнерами» — из общего модуля. */
export { TASKS_PARTNERS_GROUP_ID } from './tasksGroup';

/** Служебный статус задачи, которая исключается из отчёта. */
const TASK_STAGE_EXCLUDED = '16688';

/** Стадия задачи: название и цвет из Bitrix. */
export interface TaskStageInfo {
  id: string;
  title: string;
  color: string;
}

/**
 * Стадии задач группы: task.stages.get с entityId = id группы.
 * Кэш на сессию — стадии меняются редко.
 */
let cachedTaskStages: Map<string, TaskStageInfo> | null = null;

export async function loadTaskStages(): Promise<Map<string, TaskStageInfo>> {
  if (cachedTaskStages) {
    return cachedTaskStages;
  }

  const stages = new Map<string, TaskStageInfo>();

  try {
    const raw = await callBxMethod<Record<string, Record<string, unknown>>>(
      'task.stages.get',
      { entityId: TASKS_PARTNERS_GROUP_ID },
    );

    Object.values(raw ?? {}).forEach((stage) => {
      const id = String(stage.ID ?? stage.id ?? '').trim();
      const title = String(stage.TITLE ?? stage.title ?? '').trim();
      if (!id || !title) {
        return;
      }
      stages.set(id, {
        id,
        title,
        color: String(stage.COLOR ?? stage.color ?? '').trim(),
      });
    });
  } catch (error) {
    console.warn('Не удалось загрузить стадии задач группы:', error);
  }

  cachedTaskStages = stages;
  return stages;
}

/** Сброс кэша стадий — только для тестов. */
export function resetTaskStagesCacheForTests(): void {
  cachedTaskStages = null;
}

/**
 * Соответствие стандартного статуса задачи (tasks.task STATUS) подписи.
 * Используется, если стадия задачи неизвестна.
 * 1 — новый, 2 — ждёт выполнения, 3 — выполняется, 4 — ждёт контроля,
 * 5 — завершена, 6 — отложена, 7 — отклонена.
 */
const TASK_STATUS_LABELS: Record<string, string> = {
  '1': 'Новая',
  '2': 'Ожидание',
  '3': 'В работе',
  '4': 'Ждёт контроля',
  '5': 'Готово',
  '6': 'Отложена',
  '7': 'Отклонена',
};

/** Подпись статуса по стадии с откатом на стандартный STATUS. */
export function resolveTaskStatusLabel(
  stageId: string,
  status: string,
  stages?: Map<string, TaskStageInfo>,
): string {
  const byStage = (stages ?? cachedTaskStages)?.get(stageId)?.title;
  if (byStage) {
    return byStage;
  }
  return TASK_STATUS_LABELS[status] ?? (status ? `Статус ${status}` : '');
}

/** Группировка стандартных статусов для оформления чипа. */
const TASK_STATUS_TONES: Record<string, TaskStatusTone> = {
  '1': 'new',
  '2': 'waiting',
  '3': 'progress',
  '4': 'waiting',
  '5': 'done',
  '6': 'muted',
  '7': 'muted',
};

/**
 * Тон чипа: если у стадии есть цвет из Bitrix — определяем тон по нему,
 * иначе откатываемся на стандартный статус.
 */
export function resolveTaskStatusTone(
  stageId: string,
  status: string,
  stages?: Map<string, TaskStageInfo>,
): TaskStatusTone {
  const color = (stages ?? cachedTaskStages)?.get(stageId)?.color?.toLowerCase();
  if (color) {
    const tone = toneFromColor(color);
    if (tone) {
      return tone;
    }
  }
  return TASK_STATUS_TONES[status] ?? 'muted';
}

/** Тон по HEX-цвету стадии: зелёный → готово, красный → провал, серый → пауза. */
function toneFromColor(color: string): TaskStatusTone | null {
  const hex = color.replace('#', '');
  if (hex.length !== 6) {
    return null;
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return null;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  // Почти серый — пауза/ожидание.
  if (saturation < 0.15) {
    return 'muted';
  }
  // Красный — отмена/провал.
  if (r === max && g < 120 && b < 120) {
    return 'muted';
  }
  // Зелёный — выполнено.
  if (g === max && g > 180) {
    return 'done';
  }
  return 'progress';
}

export type TaskStatusTone = 'new' | 'waiting' | 'progress' | 'done' | 'muted';

export interface TaskPartnerRow {
  /** id контакта-партнёра. */
  contactId: string;
  /** Название партнёра (ФИО из контакта). */
  partnerName: string;
  /** Компания партнёра. */
  companyName: string;
  /** Мероприятия партнёра (названия через запятую). */
  eventTitles: string;
  /** Сколько задач у партнёра. */
  taskCount: number;
  /** Сколько задач в работе. */
  inProgressCount: number;
}

export interface TaskTableRow {
  id: string;
  title: string;
  /** Название партнёра. */
  partnerName: string;
  /** Название мероприятия, если задача привязана к мероприятию. */
  eventName: string;
  contactId: string;
  eventId: string;
  /** Ответственный. */
  responsibleName: string;
  responsiblePhoto: string;
  /** Срок в формате ДД.ММ.ГГГГ. */
  deadline: string;
  /** Дата срока в формате YYYY-MM-DD. */
  deadlineDay: string;
  /** Просрочено относительно сегодняшнего дня. */
  overdue: boolean;
  /** Наступил ли срок сегодня. */
  isToday: boolean;
  /** Подпись статуса. */
  status: string;
  statusTone: TaskStatusTone;
  /** Стадия мероприятия (для отображения в деталях). */
  stageName: string;
  /** Период мероприятия: «01.10.2027 - 29.10.2027». */
  eventPeriod: string;
  /** Город мероприятия. */
  eventCity: string;
}

export interface PartnerEventItem {
  id: string;
  title: string;
  date: string;
  contactId: string;
  stageId?: string;
  city?: string;
}

export interface TasksDashboardData {
  partners: TaskPartnerRow[];
  tasks: TaskTableRow[];
  /** Все мероприятия, к которым привязаны задачи (для фильтра). */
  events: Array<{ id: string; title: string }>;
  /** Все мероприятия партнёров, сгруппированные по contactId. */
  partnerEvents: Record<string, PartnerEventItem[]>;
  /** Все ответственные (для фильтра). */
  responsibles: Array<{ id: string; name: string }>;
}

/** Первые 10 символов даты или пустая строка. */
function toIsoDay(raw: unknown): string {
  const match = String(raw ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function formatDay(raw: unknown): string {
  const day = toIsoDay(raw);
  if (!day) {
    return '';
  }
  const [year, month, date] = day.split('-');
  return `${date}.${month}.${year}`;
}

/** Извлекает привязки из UF_CRM_TASK: C_123 (контакт) и T41c_456 (мероприятие). */
export function parseTaskCrmBindings(value: unknown): {
  contactIds: string[];
  eventIds: string[];
} {
  const values = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  const contactIds: string[] = [];
  const eventIds: string[] = [];

  values.forEach((entry) => {
    const text = String(entry ?? '').trim();
    const contact = text.match(/^C_(\d+)$/i);
    if (contact) {
      contactIds.push(contact[1]);
      return;
    }
    // T41c_470 — привязка к мероприятию (смарт-процесс 1052).
    // Прочие T<id>c_ (например T38c_) относятся к другим смарт-процессам
    // и мероприятиями не считаются.
    if (text.toLowerCase().startsWith(EVENTS_CRM_TASK_PREFIX.toLowerCase())) {
      const eventId = text.slice(EVENTS_CRM_TASK_PREFIX.length).trim();
      if (/^\d+$/.test(eventId)) {
        eventIds.push(eventId);
      }
    }
  });

  return {
    contactIds: [...new Set(contactIds)],
    eventIds: [...new Set(eventIds)],
  };
}

/** Собирает абсолютный URL фото пользователя. */
function resolveUserPhotoUrl(photo: unknown): string {
  const rawPhoto = typeof photo === 'string'
    ? photo
    : photo && typeof photo === 'object'
      ? String(
        (photo as Record<string, unknown>).src
        || (photo as Record<string, unknown>).url
        || (photo as Record<string, unknown>).URL
        || '',
      )
      : '';

  if (!rawPhoto) {
    return '';
  }
  if (rawPhoto.startsWith('http')) {
    return rawPhoto;
  }
  if (rawPhoto.startsWith('//')) {
    return `https:${rawPhoto}`;
  }

  const origin = getBitrixPortalOrigin();
  return `${origin}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
}

function pickUser(task: Record<string, unknown>): { name: string; photo: string } {
  const responsible = task.responsible as Record<string, unknown> | undefined;
  if (responsible) {
    return {
      name: String(responsible.name ?? '').trim(),
      photo: resolveUserPhotoUrl(responsible.icon),
    };
  }
  return { name: '', photo: '' };
}

/** Загрузка задач рабочей группы партнёров. */
async function loadRawTasks(): Promise<Record<string, unknown>[]> {
  const params: Record<string, unknown> = {
    filter: {
      GROUP_ID: TASKS_PARTNERS_GROUP_ID,
      '!STAGE_ID': TASK_STAGE_EXCLUDED,
      // ZOMBIE=Y — задача в корзине/удаляется. Такие в отчёт не попадают.
      ZOMBIE: 'N',
      // Дополнительная страховка для задач в процессе удаления.
      '!DELETED': 'Y',
    },
    select: [
      'ID',
      'TITLE',
      'STATUS',
      'STAGE_ID',
      'DEADLINE',
      'RESPONSIBLE_ID',
      'UF_CRM_TASK',
      'GROUP_ID',
    ],
    order: { ID: 'DESC' },
  };

  const all: Record<string, unknown>[] = [];
  try {
    // fetchAllPages идёт постранично через start/next.
    const tasks = await fetchAllPages<Record<string, unknown>>('tasks.task.list', params);
    all.push(...tasks);
  } catch (error) {
    console.warn('Не удалось загрузить задачи группы партнёров:', error);
  }

  return all;
}

/** Названия стадий мероприятий. */
async function loadEventStageNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const raw = await callBxMethod<Array<Record<string, unknown>>>('crm.status.list', {
      filter: { ENTITY_ID: OUR_EVENTS_STAGE_ENTITY_ID },
    });
    (Array.isArray(raw) ? raw : []).forEach((stage) => {
      const statusId = stage.STATUS_ID ?? stage.statusId;
      const name = stage.NAME ?? stage.name;
      if (statusId != null && name != null && String(name).trim()) {
        names.set(String(statusId), String(name).trim());
      }
    });
  } catch (error) {
    console.warn('Не удалось загрузить стадии мероприятий:', error);
  }
  return names;
}

/** Контакты: ФИО и компания. */
async function loadContacts(
  ids: string[],
): Promise<Map<string, { name: string; companyId: string }>> {
  const result = new Map<string, { name: string; companyId: string }>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) {
    return result;
  }

  for (let index = 0; index < unique.length; index += 50) {
    const chunk = unique.slice(index, index + 50);
    try {
      const raw = await callBxMethod<Array<Record<string, unknown>>>('crm.contact.list', {
        filter: { '@ID': chunk },
        select: ['ID', 'NAME', 'LAST_NAME', 'COMPANY_ID'],
      });
      (Array.isArray(raw) ? raw : []).forEach((contact) => {
        const id = contact.ID ?? contact.id;
        const name = [contact.LAST_NAME, contact.NAME]
          .map((part) => String(part ?? '').trim())
          .filter(Boolean)
          .join(' ');
        if (id != null && name) {
          result.set(String(id), {
            name,
            companyId: String(contact.COMPANY_ID ?? '').trim(),
          });
        }
      });
    } catch (error) {
      console.warn('Не удалось загрузить контакты партнёров:', error);
    }
  }

  return result;
}

/** Названия компаний. */
async function loadCompanies(ids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(ids.filter((id) => id && id !== '0'))];
  if (!unique.length) {
    return result;
  }

  for (let index = 0; index < unique.length; index += 50) {
    const chunk = unique.slice(index, index + 50);
    try {
      const raw = await callBxMethod<Array<Record<string, unknown>>>('crm.company.list', {
        filter: { '@ID': chunk },
        select: ['ID', 'TITLE'],
      });
      (Array.isArray(raw) ? raw : []).forEach((company) => {
        const id = company.ID ?? company.id;
        const title = company.TITLE ?? company.title;
        if (id != null && title != null && String(title).trim()) {
          result.set(String(id), String(title).trim());
        }
      });
    } catch (error) {
      console.warn('Не удалось загрузить компании:', error);
    }
  }

  return result;
}

/** Даты и город мероприятия (смарт-процесс «Мероприятия»). */
const EVENT_START_FIELDS = ['ufCrm38_1745307580193', 'UF_CRM_38_1745307580193'];
const EVENT_END_FIELDS = ['ufCrm38_1751875905992', 'UF_CRM_38_1751875905992'];
const EVENT_CITY_FIELDS = ['ufCrm38_1753082280', 'UF_CRM_38_1753082280'];
/** Смарт-процесс «Города». */
const CITIES_ENTITY_TYPE_ID = 1094;

/** Дата «ДД.ММ.ГГГГ» из ISO-строки Bitrix. */
function formatDayLabel(raw: unknown): string {
  const match = String(raw ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
}

/** Первое непустое значение по списку полей. */
function pickFirst(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = extractScalarValues(item[key])[0];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

/**
 * Мероприятия: название, контакт, стадия, период и город.
 * Если passedIds не передан или пуст — загружает все мероприятия (для всех партнёров).
 */
async function loadEvents(
  passedIds?: string[],
): Promise<Map<string, {
  title: string;
  contactId: string;
  stageId: string;
  period: string;
  city: string;
}>> {
  const result = new Map<string, {
    title: string;
    contactId: string;
    stageId: string;
    period: string;
    city: string;
  }>();

  const filter: Record<string, unknown> = {};
  if (passedIds && passedIds.length > 0) {
    const unique = [...new Set(passedIds.filter(Boolean))];
    if (!unique.length) {
      return result;
    }
    filter['@id'] = unique;
  }

  const items = await fetchAllCrmItems(
    OUR_EVENTS_ENTITY_TYPE_ID,
    [
      'id',
      'title',
      'contactId',
      'stageId',
      ...EVENT_START_FIELDS,
      ...EVENT_END_FIELDS,
      ...EVENT_CITY_FIELDS,
    ],
    filter,
  );

  // Названия городов — отдельным справочником.
  const cityIds = [...new Set(items
    .map((item) => pickFirst(item, EVENT_CITY_FIELDS))
    .filter(Boolean))];
  const cityNames = new Map<string, string>();
  if (cityIds.length) {
    try {
      const raw = await callBxMethod<
        { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
      >('crm.item.list', {
        entityTypeId: CITIES_ENTITY_TYPE_ID,
        filter: { '@id': cityIds },
        select: ['id', 'title'],
      });
      const cities = Array.isArray(raw) ? raw : (raw?.items ?? []);
      cities.forEach((city) => {
        const id = city.id ?? city.ID;
        const title = city.title ?? city.TITLE;
        if (id != null && title != null && String(title).trim()) {
          cityNames.set(String(id), String(title).trim());
        }
      });
    } catch (error) {
      console.warn('Не удалось загрузить города мероприятий:', error);
    }
  }

  items.forEach((item) => {
    const id = item.id ?? item.ID;
    if (id == null) {
      return;
    }
    const contactRaw = item.contactId ?? item.CONTACT_ID;
    const contactId = String(extractScalarValues(contactRaw)[0] ?? '').trim();

    const start = formatDayLabel(pickFirst(item, EVENT_START_FIELDS));
    const end = formatDayLabel(pickFirst(item, EVENT_END_FIELDS));
    let period = '';
    if (start && end && start !== end) {
      period = `${start} - ${end}`;
    } else {
      period = start || end;
    }

    const cityId = pickFirst(item, EVENT_CITY_FIELDS);
    result.set(String(id), {
      title: String(item.title ?? item.TITLE ?? '').trim(),
      contactId,
      stageId: String(item.stageId ?? item.STAGE_ID ?? '').trim(),
      period,
      city: cityId ? (cityNames.get(cityId) ?? '') : '',
    });
  });

  return result;
}

/** Есть ли у задачи несколько ответственных (соисполнители). */
function readResponsibleNames(task: Record<string, unknown>): string {
  const user = pickUser(task);
  if (user.name) {
    return user.name;
  }
  const id = task.responsibleId ?? task.RESPONSIBLE_ID;
  return id != null && String(id).trim() ? `Пользователь #${String(id).trim()}` : '';
}

/**
 * Полный набор данных для вкладки «Задачи (NEW)»:
 * задачи группы партнёров с привязками к партнёрам и мероприятиям.
 * Включает ВСЕХ партнёров (как в Справочнике партнёров) и ВСЕ их мероприятия.
 */
export async function loadTasksDashboard(): Promise<TasksDashboardData> {
  // Параллельно загружаем сырые задачи группы, типы партнёров, все мероприятия и стадии стадий
  const [rawTasks, typeIds, eventMap, stageNames, taskStages] = await Promise.all([
    loadRawTasks(),
    getPartnerTypeIds(),
    loadEvents(),
    loadEventStageNames(),
    loadTaskStages(),
  ]);

  const mappedRaw = rawTasks
    .map((task) => {
      const id = String(task.id ?? task.ID ?? '').trim();
      if (!id) {
        return null;
      }
      const status = String(task.status ?? task.STATUS ?? '').trim();
      const stageId = String(task.stageId ?? task.STAGE_ID ?? '').trim();
      const bindings = parseTaskCrmBindings(task.ufCrmTask ?? task.UF_CRM_TASK);
      return {
        id,
        title: String(task.title ?? task.TITLE ?? `Задача #${id}`).trim(),
        status,
        stageId,
        deadline: formatDay(task.deadline ?? task.DEADLINE),
        deadlineDay: toIsoDay(task.deadline ?? task.DEADLINE),
        responsibleId: String(task.responsibleId ?? task.RESPONSIBLE_ID ?? '').trim(),
        responsibleName: readResponsibleNames(task),
        responsiblePhoto: pickUser(task).photo,
        contactIds: bindings.contactIds,
        eventIds: bindings.eventIds,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  // 1. Загружаем всех партнёров по фильтру справочника партнёров
  let partnerContacts: Array<Record<string, unknown>> = [];
  try {
    partnerContacts = await fetchAllContactList<Record<string, unknown>>({
      filter: buildPartnersContactFilter(typeIds),
      select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'COMPANY_ID'],
    });
  } catch (error) {
    console.warn('Не удалось загрузить партнёров по фильтру:', error);
  }

  // Собираем contactMap
  const contactMap = new Map<string, { name: string; companyId: string }>();
  partnerContacts.forEach((contact) => {
    const id = String(contact.ID ?? contact.id ?? '').trim();
    if (!id) {
      return;
    }
    const name = [contact.LAST_NAME, contact.NAME, contact.SECOND_NAME]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' ') || `Партнер #${id}`;
    contactMap.set(id, {
      name,
      companyId: String(contact.COMPANY_ID ?? contact.companyId ?? '').trim(),
    });
  });

  // Также проверяем, нет ли контактов из задач или мероприятий, которых ещё нет в contactMap
  const missingContactIds = new Set<string>();
  mappedRaw.forEach((row) => {
    row.contactIds.forEach((id) => {
      if (id && !contactMap.has(id)) {
        missingContactIds.add(id);
      }
    });
    row.eventIds.forEach((eventId) => {
      const contactId = eventMap.get(eventId)?.contactId;
      if (contactId && !contactMap.has(contactId)) {
        missingContactIds.add(contactId);
      }
    });
  });

  if (missingContactIds.size > 0) {
    const extraContacts = await loadContacts([...missingContactIds]);
    extraContacts.forEach((val, id) => {
      contactMap.set(id, val);
    });
  }

  // Загружаем компании для всех контактов
  const companyMap = await loadCompanies(
    [...contactMap.values()].map((contact) => contact.companyId),
  );

  // Группируем ВСЕ мероприятия по контактам
  const partnerEvents: Record<string, PartnerEventItem[]> = {};
  eventMap.forEach((event, eventId) => {
    if (!event.contactId) {
      return;
    }
    if (!partnerEvents[event.contactId]) {
      partnerEvents[event.contactId] = [];
    }
    partnerEvents[event.contactId].push({
      id: eventId,
      title: event.title,
      date: event.period,
      contactId: event.contactId,
      stageId: event.stageId,
      city: event.city,
    });
  });

  // Сортируем мероприятия каждого партнёра по названию
  Object.values(partnerEvents).forEach((list) => {
    list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  });

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const tasks: TaskTableRow[] = mappedRaw.map((row) => {
    const event = row.eventIds.length ? eventMap.get(row.eventIds[0]) : undefined;
    const contactId = row.contactIds[0] ?? event?.contactId ?? '';
    const contact = contactId ? contactMap.get(contactId) : undefined;

    return {
      id: row.id,
      title: row.title,
      partnerName: contact?.name ?? '',
      eventName: event?.title ?? '',
      contactId,
      eventId: row.eventIds[0] ?? '',
      responsibleName: row.responsibleName,
      responsiblePhoto: row.responsiblePhoto,
      deadline: row.deadline,
      deadlineDay: row.deadlineDay,
      overdue: Boolean(row.deadlineDay && row.deadlineDay < todayIso && row.status !== '5'),
      isToday: Boolean(row.deadlineDay && row.deadlineDay === todayIso),
      // Статус берётся из стадии задачи в Bitrix, с откатом на STATUS.
      status: resolveTaskStatusLabel(row.stageId, row.status, taskStages),
      statusTone: resolveTaskStatusTone(row.stageId, row.status, taskStages),
      stageName: event ? (stageNames.get(event.stageId) ?? '') : '',
      eventPeriod: event?.period ?? '',
      eventCity: event?.city ?? '',
    };
  });

  return {
    tasks,
    partners: buildPartnerRows(tasks, contactMap, companyMap, partnerEvents),
    events: [...eventMap.entries()]
      .map(([id, ev]) => ({ id, title: ev.title || `Мероприятие #${id}` }))
      .sort((left, right) => left.title.localeCompare(right.title, 'ru')),
    partnerEvents,
    responsibles: buildResponsibleOptions(mappedRaw),
  };
}

function buildPartnerRows(
  tasks: TaskTableRow[],
  contactMap: Map<string, { name: string; companyId: string }>,
  companyMap: Map<string, string>,
  partnerEvents: Record<string, PartnerEventItem[]> = {},
): TaskPartnerRow[] {
  const byContact = new Map<string, TaskTableRow[]>();
  tasks.forEach((task) => {
    if (!task.contactId) {
      return;
    }
    const list = byContact.get(task.contactId) ?? [];
    list.push(task);
    byContact.set(task.contactId, list);
  });

  // Включаем всех контактов из contactMap
  return [...contactMap.entries()]
    .map(([contactId, contact]) => {
      const list = byContact.get(contactId) ?? [];
      const events = partnerEvents[contactId]?.map((e) => e.title)
        ?? [...new Set(list.map((task) => task.eventName).filter(Boolean))];
      return {
        contactId,
        partnerName: contact.name,
        companyName: companyMap.get(contact.companyId) ?? '',
        eventTitles: events.join(', '),
        taskCount: list.length,
        inProgressCount: list.filter((task) => task.statusTone === 'progress').length,
      };
    })
    .sort((left, right) => right.taskCount - left.taskCount
      || left.partnerName.localeCompare(right.partnerName, 'ru'));
}

function buildResponsibleOptions(
  rows: Array<{ responsibleId: string; responsibleName: string }>,
): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  rows.forEach((row) => {
    if (row.responsibleId && row.responsibleName) {
      map.set(row.responsibleId, row.responsibleName);
    }
  });
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
}

/** Привязки задачи: партнёр (C_) и мероприятие (T41c_). */
export function buildTaskCrmBindings(
  contactId: string,
  eventId?: string,
): string[] {
  const bindings: string[] = [];
  if (contactId) {
    bindings.push(`C_${contactId}`);
  }
  if (eventId) {
    // Именно T41c_ (не T38c_): 41 — номер смарт-процесса в crm.item.
    bindings.push(`${EVENTS_CRM_TASK_PREFIX}${eventId}`);
  }
  return bindings;
}

export interface CreateTaskInput {
  /** Название задачи. */
  title: string;
  /** id партнёра-контакта. */
  contactId: string;
  /** id мероприятия (необязательно). */
  eventId?: string;
  /** Ответственный (необязательно — по умолчанию текущий пользователь). */
  responsibleId?: string;
}

/** Текущий пользователь портала (id из profile). */
let cachedCurrentUserId: number | null | undefined;

export async function resolveCurrentUserId(): Promise<number | null> {
  if (cachedCurrentUserId !== undefined) {
    return cachedCurrentUserId;
  }

  try {
    const raw = await callBxMethod<{ ID?: string | number; id?: string | number }>(
      'profile',
      {},
    );
    const id = Number(raw?.ID ?? raw?.id);
    cachedCurrentUserId = Number.isFinite(id) && id > 0 ? id : null;
  } catch (error) {
    console.warn('Не удалось получить текущего пользователя:', error);
    cachedCurrentUserId = null;
  }

  return cachedCurrentUserId;
}

/**
 * Создаёт задачу через tasks.task.add и возвращает её id.
 * Задача сразу привязывается к группе партнёров (1314) и к сущностям CRM,
 * поэтому появляется и в отчёте, и в группе Bitrix.
 * Исполнитель по умолчанию — текущий пользователь.
 */
export async function createPartnerTask(
  input: CreateTaskInput,
): Promise<{ id: string }> {
  if (!input.contactId) {
    throw new Error('Не указан партнёр для задачи');
  }

  const bindings = buildTaskCrmBindings(input.contactId, input.eventId);

  const fields: Record<string, unknown> = {
    TITLE: input.title,
    // Группа «Задачи "Отдел по работе с партнерами"».
    GROUP_ID: TASKS_PARTNERS_GROUP_ID,
    UF_CRM_TASK: bindings,
  };

  // Исполнитель — переданный явно либо текущий пользователь (создатель).
  let responsible = Number(input.responsibleId);
  if (!Number.isFinite(responsible) || responsible <= 0) {
    responsible = (await resolveCurrentUserId()) ?? 0;
  }
  if (responsible > 0) {
    fields.RESPONSIBLE_ID = responsible;
    // Создатель и исполнитель — один и тот же пользователь.
    fields.CREATED_BY = responsible;
  }

  const raw = await callBxMethod<{ task?: { id?: string | number }; id?: string | number }>(
    'tasks.task.add',
    { fields },
  );

  const id = String(raw?.task?.id ?? raw?.id ?? '');
  if (!id) {
    throw new Error('Не удалось создать задачу');
  }

  // Страховка: если группа не применилась при создании — привязываем отдельно.
  try {
    const detail = await callBxMethod<{ task?: Record<string, unknown> }>(
      'tasks.task.get',
      { taskId: id, select: ['ID', 'GROUP_ID'] },
    );
    const groupId = String(detail?.task?.groupId ?? detail?.task?.GROUP_ID ?? '');
    if (groupId !== String(TASKS_PARTNERS_GROUP_ID)) {
      await callBxMethod('tasks.task.update', {
        taskId: id,
        fields: { GROUP_ID: TASKS_PARTNERS_GROUP_ID },
      });
    }
  } catch (error) {
    console.warn('Не удалось проверить привязку задачи к группе:', error);
  }

  return { id };
}

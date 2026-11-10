<template>
  <section class="events-new">
    <LoadingProgress
      :visible="isLoading"
      :message="loadingMessage"
      :model-value="loadingProgress"
      :auto-hide="false"
    />

    <template v-if="!isLoading">
      <section class="events-new__filter-card filter-card panel workspace-panel">
        <div class="filters">
          <div class="filter-item">
            <span class="filter-label">Ответственный</span>
            <v-autocomplete
              v-model="selectedAssigned"
              :items="assignedOptions"
              item-title="title"
              item-value="id"
              placeholder="Все ответственные"
              density="compact"
              single-line
              variant="outlined"
              hide-details
              clearable
              multiple
              chips
              closable-chips
              prepend-inner-icon="$accountOutline"
            />
          </div>

          <div class="filter-item">
            <span class="filter-label">Партнер</span>
            <v-autocomplete
              v-model="selectedClients"
              :items="clientOptions"
              item-title="title"
              item-value="id"
              placeholder="Все партнеры"
              density="compact"
              single-line
              variant="outlined"
              hide-details
              clearable
              multiple
              chips
              closable-chips
              prepend-inner-icon="$handshake"
            >
              <template #prepend-inner>
                <img :src="partnersFilterIcon" alt="Партнер" class="filter-icon" />
              </template>
            </v-autocomplete>
          </div>

          <div class="filter-item">
            <span class="filter-label">Целевая аудитория</span>
            <v-autocomplete
              v-model="selectedAudiences"
              :items="audienceOptions"
              item-title="title"
              item-value="id"
              placeholder="Вся целевая аудитория"
              density="compact"
              single-line
              variant="outlined"
              hide-details
              clearable
              multiple
              chips
              closable-chips
              prepend-inner-icon="$accountMultipleOutline"
            />
          </div>

          <div class="filter-item">
            <span class="filter-label">Мероприятие</span>
            <v-autocomplete
              v-model="selectedEvents"
              :items="eventOptions"
              item-title="title"
              item-value="id"
              placeholder="Все мероприятия"
              density="compact"
              single-line
              variant="outlined"
              hide-details
              clearable
              multiple
              chips
              closable-chips
              prepend-inner-icon="$calendarStar"
            />
          </div>

          <div class="filter-item">
            <span class="filter-label">Стадия</span>
            <v-autocomplete
              v-model="selectedStages"
              :items="stageOptions"
              item-title="title"
              item-value="id"
              placeholder="Все стадии"
              density="compact"
              single-line
              variant="outlined"
              hide-details
              clearable
              multiple
              chips
              closable-chips
              prepend-inner-icon="$shieldCheckOutline"
            />
          </div>

          <!-- Фильтр по дате — как в detail-report (DateFilter). -->
          <div class="filter-item filter-item--period">
            <span class="filter-label">Дата</span>
            <DateFilter
              ref="dateFilterRef"
              class="period-date-filter"
              :key="dateFilterKey"
              :show-input="dateFilterShowInput"
              :selected-date-name="selectedDateName"
              :selected-date-iso="selectedDateIso"
              @update:selected-date-name="onDateFilterNameChange"
              @send-value="onDateFilterChange"
            />
          </div>
        </div>
      </section>

      <section class="report-table-section">
        <v-card class="monthly-report-table-card report-table-card report-table-card--sticky panel activity-report-card">
          <v-card-title class="report-table-title events-new__table-title">
            <div class="events-new__table-title-main">
              Активность по мероприятию
              <span class="events-new__count">{{ filteredRows.length }}</span>
            </div>
            <button
              type="button"
              class="monthly-summary__btn"
              @click="createEvent"
            >
              + Создать мероприятие
            </button>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="filteredRows"
            item-value="id"
            density="comfortable"
            hover
            class="report-data-table report-data-table--paginated activity-report-table sticky-report-table monthly-report-table"
            :items-per-page="25"
          >
            <template #item.general="{ item }">
              <div class="events-new__stack">
                <div class="events-new__field">
                  <span class="events-new__field-label">Мероприятие:</span>
                  <button
                    type="button"
                    class="event-link events-new__title"
                    :title="item.title"
                    @click="openEvent(item.id)"
                  >
                    {{ item.title }}
                  </button>
                </div>
                <div v-if="item.audience" class="events-new__field">
                  <span class="events-new__field-label">Целевая аудитория:</span>
                  <span class="events-new__stack-text">{{ item.audience }}</span>
                </div>
                <div v-if="item.period" class="events-new__field">
                  <span class="events-new__field-label">Даты:</span>
                  <span class="events-new__date">{{ item.period }}</span>
                </div>
                <div v-if="item.type" class="events-new__field">
                  <span class="events-new__field-label">Тип:</span>
                  <span class="events-new__stack-text">{{ item.type }}</span>
                </div>
                <div v-if="item.city" class="events-new__field">
                  <span class="events-new__field-label">Город:</span>
                  <span class="events-new__stack-text">{{ item.city }}</span>
                </div>
              </div>
            </template>

            <template #item.extra="{ item }">
              <div class="events-new__stack">
                <div v-if="item.projectCategory" class="events-new__field">
                  <span class="events-new__field-label">Категория проекта:</span>
                  <span class="events-new__stack-text">{{ item.projectCategory }}</span>
                </div>
                <div v-if="item.venue" class="events-new__field">
                  <span class="events-new__field-label">Площадка:</span>
                  <span class="events-new__stack-text">{{ item.venue }}</span>
                </div>
                <div v-if="item.legalEntity" class="events-new__field">
                  <span class="events-new__field-label">Юр. лицо организатор:</span>
                  <span class="events-new__stack-text">{{ item.legalEntity }}</span>
                </div>
                <span v-if="!hasExtra(item)" class="events-new__empty">—</span>
              </div>
            </template>

            <template #item.stage="{ item }">
              <span class="card-stage" :style="getStageStyle(item.stageId)">{{ item.stage || '—' }}</span>
            </template>

            <template #item.client="{ item }">
              <button
                v-if="item.clientId"
                type="button"
                class="event-link events-new__client"
                @click="openClient(item.clientId)"
              >
                {{ item.client }}
              </button>
              <span v-else class="events-new__empty">—</span>
            </template>

            <template #item.accountManager="{ item }">
              <div v-if="item.managerName" class="responsible-cell">
                <v-avatar size="24" color="primary" variant="tonal">
                  <img
                    v-if="getPhoto(item)"
                    :src="getPhoto(item)"
                    :alt="item.managerName"
                    class="avatar-image"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="markAvatarFailed(getPhoto(item))"
                  >
                  <span v-else class="avatar-initials">
                    {{ getInitials(item.managerName) }}
                  </span>
                </v-avatar>
                <span class="responsible-name">{{ item.managerName }}</span>
              </div>
              <span v-else class="events-new__empty">—</span>
            </template>

            <template #item.otherManagers="{ item }">
              <div class="events-new__stack">
                <div v-if="item.salesManagers.length" class="events-new__field-block">
                  <span class="events-new__field-label">Менеджер отдела продаж:</span>
                  <div class="events-new__people">
                    <div
                      v-for="user in item.salesManagers"
                      :key="`sales-${user.id}`"
                      class="responsible-cell"
                    >
                      <v-avatar size="24" color="primary" variant="tonal">
                        <img
                          v-if="getUserPhoto(user)"
                          :src="getUserPhoto(user)"
                          :alt="user.name"
                          class="avatar-image"
                          loading="lazy"
                          referrerpolicy="no-referrer"
                          @error="markAvatarFailed(user.photo)"
                        >
                        <span v-else class="avatar-initials">{{ getInitials(user.name) }}</span>
                      </v-avatar>
                      <span class="responsible-name">{{ user.name }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="item.projectManagers.length" class="events-new__field-block">
                  <span class="events-new__field-label">Менеджер проектного отдела:</span>
                  <div class="events-new__people">
                    <div
                      v-for="user in item.projectManagers"
                      :key="`project-${user.id}`"
                      class="responsible-cell"
                    >
                      <v-avatar size="24" color="primary" variant="tonal">
                        <img
                          v-if="getUserPhoto(user)"
                          :src="getUserPhoto(user)"
                          :alt="user.name"
                          class="avatar-image"
                          loading="lazy"
                          referrerpolicy="no-referrer"
                          @error="markAvatarFailed(user.photo)"
                        >
                        <span v-else class="avatar-initials">{{ getInitials(user.name) }}</span>
                      </v-avatar>
                      <span class="responsible-name">{{ user.name }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="item.expoManagers.length" class="events-new__field-block">
                  <span class="events-new__field-label">Менеджер выставочного отдела:</span>
                  <div class="events-new__people">
                    <div
                      v-for="user in item.expoManagers"
                      :key="`expo-${user.id}`"
                      class="responsible-cell"
                    >
                      <v-avatar size="24" color="primary" variant="tonal">
                        <img
                          v-if="getUserPhoto(user)"
                          :src="getUserPhoto(user)"
                          :alt="user.name"
                          class="avatar-image"
                          loading="lazy"
                          referrerpolicy="no-referrer"
                          @error="markAvatarFailed(user.photo)"
                        >
                        <span v-else class="avatar-initials">{{ getInitials(user.name) }}</span>
                      </v-avatar>
                      <span class="responsible-name">{{ user.name }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="item.projectGroup" class="events-new__field">
                  <span class="events-new__field-label">Проектная группа / Мед. студия:</span>
                  <span class="events-new__stack-text">{{ item.projectGroup }}</span>
                </div>
                <span v-if="!hasOtherManagers(item)" class="events-new__empty">—</span>
              </div>
            </template>

            <template #item.finance="{ item }">
              <div class="events-new__stack">
                <!-- % выполнения продаж — вверху ячейки с прогресс-баром сбора. -->
                <div v-if="getCollectedPercent(item) > 0" class="percent-cell">
                  <span class="events-new__field-label">% Выполнения продаж:</span>
                  <span class="percent-cell__value">{{ formatPercent(getCollectedPercent(item)) }}</span>
                  <div class="percent-cell__track">
                    <div
                      class="percent-cell__fill"
                      :class="getPercentBarClass(getCollectedPercent(item))"
                      :style="{ width: `${visualPercent(getCollectedPercent(item))}%` }"
                    />
                  </div>
                </div>
                <div v-if="item.plan" class="events-new__field">
                  <span class="events-new__field-label">План выручки от спонсоров:</span>
                  <span class="events-new__stack-text">{{ formatMoney(item.plan) }}</span>
                </div>
                <div v-if="item.collected" class="events-new__field">
                  <span class="events-new__field-label">Собранная сумма:</span>
                  <span class="events-new__stack-text">{{ formatMoney(item.collected) }}</span>
                </div>
                <span v-if="!hasFinance(item)" class="events-new__empty">—</span>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import LoadingProgress from '../../../components/LoadingProgress.vue';
import DateFilter from '../../../components/TheForm/Date/Date.vue';
import partnersFilterIcon from '../assets/icons/partners-filter.png';
import { useStickyReportTableHeaders } from '../../../composables/useStickyReportTableHeaders';
import { buildContactDetailsPath, openBitrixPath } from '../functions/bitrixPath';
import {
  loadOurEventsList,
  type EventUserRef,
  type OurEventListRow,
} from '../functions/ourEventsList';
import { OUR_EVENTS_ENTITY_TYPE_ID } from '../functions/ourEventsMetric';

const isLoading = ref(true);
const loadingProgress = ref(0);
const loadingMessage = ref('Загрузка мероприятий…');

const rows = ref<OurEventListRow[]>([]);

/**
 * Список ответственных формируется динамически из загруженных мероприятий
 * аналогично detail-report (менеджеры ufCrm38_1753082810 / аккаунт-отдела).
 */
const assignedOptions = computed(() => {
  const map = new Map<string, string>();
  rows.value.forEach((row) => {
    // Менеджеры отдела продаж (ufCrm38_1753082810 — как в detail-report)
    row.salesManagers.forEach((user) => {
      if (user.id && user.name) {
        map.set(String(user.id), user.name);
      }
    });
    // Менеджеры аккаунт-отдела
    if (row.managerIds && row.managerName) {
      const names = row.managerName.split(',').map((part) => part.trim());
      row.managerIds.forEach((id, idx) => {
        if (id && !map.has(String(id))) {
          map.set(String(id), names[idx] || names[0] || `Сотрудник ${id}`);
        }
      });
    }
  });
  return [...map.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
});

const selectedAssigned = ref<string[]>([]);
const selectedClients = ref<string[]>([]);
const selectedAudiences = ref<string[]>([]);
const selectedEvents = ref<string[]>([]);
const selectedStages = ref<string[]>([]);
const failedAvatars = ref<Set<string>>(new Set());

const {
  mountStickyReportTableHeaders,
  refreshStickyReportTableHeaders,
  unmountStickyReportTableHeaders,
} = useStickyReportTableHeaders();

/** Фильтр по дате — как в detail-report. */
const DEFAULT_DATE_FILTER_NAME = 'Квартал';

/** Какие дополнительные поля показывать для выбранного типа фильтра. */
function buildDateFilterShowInput(dateName = DEFAULT_DATE_FILTER_NAME): boolean[] {
  return [
    dateName === 'Последние N дней',
    dateName === 'Месяц',
    dateName === 'Квартал',
    dateName === 'Год',
    dateName === 'Диапазон',
    dateName === 'Точная дата',
    dateName === 'Следующие N дней',
    dateName === 'Полугодие',
  ];
}

const selectedDateIso = ref<Array<string | null>>([null, null]);
const selectedDateName = ref(DEFAULT_DATE_FILTER_NAME);
const dateFilterShowInput = ref(buildDateFilterShowInput(DEFAULT_DATE_FILTER_NAME));
const dateFilterKey = ref(0);
const dateFilterRef = ref<{ flush?: () => Array<string | null> } | null>(null);

/**
 * Колонки по макету: каждая ячейка — набор строк «Название: Значение».
 */
const headers = [
  { title: 'Общие данные', key: 'general', align: 'start' as const, sortable: false },
  { title: 'Доп. параметры', key: 'extra', align: 'start' as const, sortable: false },
  { title: 'Стадия', key: 'stage', align: 'center' as const, sortable: false },
  { title: 'Клиент', key: 'client', align: 'start' as const, sortable: false },
  // Узкая колонка — по ширине даты в «Общих данных».
  { title: 'Ответственный аккаунт', key: 'accountManager', align: 'start' as const, sortable: false, width: 150 },
  { title: 'Другие ответственные', key: 'otherManagers', align: 'start' as const, sortable: false },
  { title: 'Компании и финансы', key: 'finance', align: 'start' as const, sortable: false },
];

/** Есть ли хоть одно значение в блоке «Доп. параметры». */
function hasExtra(item: OurEventListRow): boolean {
  return Boolean(item.projectCategory || item.venue || item.legalEntity);
}

/** Есть ли хоть один «другой ответственный». */
function hasOtherManagers(item: OurEventListRow): boolean {
  return Boolean(
    item.salesManagers.length
    || item.projectManagers.length
    || item.expoManagers.length
    || item.projectGroup,
  );
}

/** Есть ли финансовые показатели. */
function hasFinance(item: OurEventListRow): boolean {
  return Boolean(item.plan || item.collected || getCollectedPercent(item) > 0);
}

/**
 * % выполнения продаж = собранная сумма / план выручки × 100.
 * Считается из полей, а не берётся из UF: на портале там формула-заглушка «=/*100».
 */
function getCollectedPercent(item: OurEventListRow): number {
  if (!item.plan || item.plan <= 0) {
    return 0;
  }
  const percent = (item.collected / item.plan) * 100;
  return Number.isFinite(percent) ? Math.max(0, percent) : 0;
}

/** Ограничение ширины заливки прогресс-бара. */
function visualPercent(percent: number): number {
  return Math.min(100, Math.max(0, percent));
}

/** Подпись процента: целое или округлённое значение. */
function formatPercent(percent: number): string {
  const value = Math.max(0, percent);
  return `${Number.isInteger(value) ? value : Math.round(value)}%`;
}

/** Цвет заливки по уровню выполнения (как в detail-report). */
function getPercentBarClass(percent: number): string {
  const value = visualPercent(percent);
  if (value <= 40) {
    return 'percent-cell__fill--red';
  }
  if (value <= 74) {
    return 'percent-cell__fill--orange';
  }
  return 'percent-cell__fill--green';
}

/** Денежный формат для финансового блока. */
function formatMoney(value: number): string {
  if (!value) {
    return '—';
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Клиенты из загруженных мероприятий. */
const clientOptions = computed(() => {
  const unique = new Map<string, string>();
  rows.value.forEach((row) => {
    if (row.clientId && row.client) {
      unique.set(row.clientId, row.client);
    }
  });
  return [...unique.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
});

/** Целевая аудитория — значения разбиваются по запятой. */
const audienceOptions = computed(() => {
  const unique = new Set<string>();
  rows.value.forEach((row) => {
    row.audience.split(',').forEach((part) => {
      const value = part.trim();
      if (value) {
        unique.add(value);
      }
    });
  });
  return [...unique].sort((left, right) => left.localeCompare(right, 'ru'))
    .map((value) => ({ id: value, title: value }));
});

/** Сами мероприятия — для точечного отбора. */
const eventOptions = computed(() => rows.value
  .map((row) => ({ id: row.id, title: row.title }))
  .sort((left, right) => left.title.localeCompare(right.title, 'ru')));

/** Стадии из загруженных мероприятий. */
const stageOptions = computed(() => {
  const unique = new Map<string, string>();
  rows.value.forEach((row) => {
    if (row.stageId && row.stage) {
      unique.set(row.stageId, row.stage);
    }
  });
  return [...unique.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
});

const filteredRows = computed(() => rows.value.filter((row) => {
  // Ответственный: проверка совпадения с менеджерами мероприятия (отдел продаж и аккаунт-отдел)
  if (selectedAssigned.value.length) {
    const rowManagerIds = [
      ...(row.managerIds || []),
      ...(row.salesManagerIds || []),
      ...(row.managerId ? [row.managerId] : []),
      ...row.salesManagers.map((m) => String(m.id)),
    ].map(String);
    if (!selectedAssigned.value.some((id) => rowManagerIds.includes(String(id)))) {
      return false;
    }
  }
  if (selectedClients.value.length && !selectedClients.value.includes(row.clientId)) {
    return false;
  }
  if (selectedEvents.value.length && !selectedEvents.value.includes(row.id)) {
    return false;
  }
  if (selectedStages.value.length && !selectedStages.value.includes(row.stageId)) {
    return false;
  }
  // Фильтр по дате: мероприятие попадает в диапазон, если пересекается с ним.
  if (!isEventWithinDateRange(row)) {
    return false;
  }
  if (selectedAudiences.value.length) {
    const rowAudiences = row.audience.split(',').map((part) => part.trim());
    if (!selectedAudiences.value.some((value) => rowAudiences.includes(value))) {
      return false;
    }
  }
  return true;
}));

/** Цвет стадии из настроек воронки (фолбэк — нейтральный). */
function getStageStyle(stageId: string): Record<string, string> {
  const color = STAGE_COLORS[stageId];
  if (!color) {
    return {};
  }
  return {
    backgroundColor: `${color}22`,
    color,
  };
}

function getPhoto(item: OurEventListRow): string {
  const url = item.managerPhoto ?? '';
  if (!url || failedAvatars.value.has(url)) {
    return '';
  }
  return url;
}

/** Фото сотрудника из списка «Другие ответственные». */
function getUserPhoto(user: EventUserRef): string {
  const url = user.photo ?? '';
  return url && !failedAvatars.value.has(url) ? url : '';
}

function markAvatarFailed(url: string) {
  if (!url) {
    return;
  }
  failedAvatars.value = new Set([...failedAvatars.value, url]);
}

function getInitials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function resetFilters() {
  selectedAssigned.value = [];
  selectedClients.value = [];
  selectedAudiences.value = [];
  selectedEvents.value = [];
  selectedStages.value = [];
  // Сброс фильтра по дате — пересоздаём компонент на значениях по умолчанию.
  selectedDateName.value = DEFAULT_DATE_FILTER_NAME;
  dateFilterShowInput.value = buildDateFilterShowInput(DEFAULT_DATE_FILTER_NAME);
  selectedDateIso.value = [null, null];
  dateFilterKey.value += 1;
}

/** Родитель получил новый диапазон дат из Date.vue. */
function onDateFilterChange(value: unknown) {
  selectedDateIso.value = Array.isArray(value)
    ? [value[0] ?? null, value[1] ?? null]
    : [null, null];
}

/** Изменился тип фильтра («Месяц», «Квартал», «Диапазон»…). */
function onDateFilterNameChange(name: string) {
  const nextName = name || DEFAULT_DATE_FILTER_NAME;
  selectedDateName.value = nextName;
  dateFilterShowInput.value = buildDateFilterShowInput(nextName);
}

/** Мероприятие попадает в выбранный диапазон дат, если пересекается с ним. */
function isEventWithinDateRange(row: OurEventListRow): boolean {
  const [fromIso, toIso] = selectedDateIso.value;
  if (!fromIso && !toIso) {
    return true;
  }

  // Дата начала мероприятия (ISO). Если её нет — фильтр не применяем.
  const startRaw = row.startIso;
  if (!startRaw) {
    return true;
  }

  const start = new Date(`${startRaw}T00:00:00`).getTime();
  const from = fromIso ? new Date(fromIso).setHours(0, 0, 0, 0) : null;
  const to = toIso ? new Date(toIso).setHours(23, 59, 59, 999) : null;

  if (!Number.isFinite(start)) {
    return true;
  }
  if (from != null && start < from) {
    return false;
  }
  if (to != null && start > to) {
    return false;
  }
  return true;
}

function openEvent(eventId: string) {
  if (!eventId) {
    return;
  }
  openBitrixPath(`/crm/type/${OUR_EVENTS_ENTITY_TYPE_ID}/details/${eventId}/`);
}

function createEvent() {
  openBitrixPath(`/crm/type/${OUR_EVENTS_ENTITY_TYPE_ID}/details/0/`, () => {
    void loadData();
  });
}

function openClient(contactId: string) {
  if (!contactId) {
    return;
  }
  openBitrixPath(buildContactDetailsPath(contactId));
}

async function loadData() {
  isLoading.value = true;
  loadingProgress.value = 20;
  loadingMessage.value = 'Загрузка мероприятий…';

  try {
    const list = await loadOurEventsList();
    loadingProgress.value = 90;
    rows.value = list;
    loadingProgress.value = 100;
    loadingMessage.value = 'Готово';
    window.setTimeout(() => {
      isLoading.value = false;
      void nextTick(() => {
        refreshStickyReportTableHeaders();
      });
    }, 150);
  } catch (error) {
    console.error('Не удалось загрузить мероприятия:', error);
    loadingProgress.value = 100;
    isLoading.value = false;
  }
}

/** Цвета стадий воронки 110 (как в Bitrix). */
const STAGE_COLORS: Record<string, string> = {
  'DT1052_110:NEW': '#0ea5e9',
  'DT1052_110:UC_2HLLSK': '#0ea5e9',
  'DT1052_110:UC_1JSLKA': '#d97706',
  'DT1052_110:UC_5F4J54': '#0891b2',
  'DT1052_110:UC_EH7WD7': '#0284c7',
  'DT1052_110:UC_XWF0KT': '#ca8a04',
  'DT1052_110:UC_2QDJLH': '#16a34a',
  'DT1052_110:SUCCESS': '#22c55e',
  'DT1052_110:FAIL': '#dc2626',
};

watch(filteredRows, () => {
  void nextTick(() => {
    refreshStickyReportTableHeaders();
  });
});

onMounted(() => {
  mountStickyReportTableHeaders();
  void loadData();
});

onUnmounted(() => {
  unmountStickyReportTableHeaders();
});

/** Ручное обновление извне — кнопка «Обновить» в шапке. */
defineExpose({ reload: loadData });
</script>

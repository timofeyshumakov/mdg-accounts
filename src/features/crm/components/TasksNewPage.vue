<template>
  <section class="tasks-dashboard">
    <LoadingProgress
      :visible="isLoading"
      :message="loadingMessage"
      :model-value="loadingProgress"
      :auto-hide="false"
    />

    <template v-if="!isLoading">
      <div class="tasks-app">
        <!-- Левый сайдбар: тип задач и список партнёров -->
        <aside class="tasks-sidebar panel">
          <div class="tasks-sidebar__head">
            <span class="tasks-sidebar__title">Тип задач</span>
          </div>

          <div class="tasks-sidebar__nav-group">
            <button
              type="button"
              class="tasks-nav-btn"
              :class="{ 'tasks-nav-btn--active': scopeMode === 'all' }"
              @click="setScope('all')"
            >
              <span>Все задачи</span>
              <span class="tasks-badge">{{ tasks.length }}</span>
            </button>
            <button
              type="button"
              class="tasks-nav-btn"
              :class="{ 'tasks-nav-btn--active': scopeMode === 'general' }"
              @click="setScope('general')"
            >
              <span>Общие задачи</span>
              <span class="tasks-badge">{{ generalTasksCount }}</span>
            </button>
          </div>

          <div class="tasks-sidebar__search">
            <div class="tasks-sidebar-search">
              <v-icon icon="$magnify" size="16" class="tasks-sidebar-search__icon" />
              <input
                v-model="partnerSearch"
                type="text"
                placeholder="Поиск партнёра…"
                aria-label="Поиск партнёра по ФИО"
              >
              <button
                v-if="partnerSearch"
                type="button"
                class="tasks-sidebar-search__clear"
                aria-label="Очистить поиск"
                @click="partnerSearch = ''"
              >
                ×
              </button>
            </div>
          </div>

          <div class="tasks-sidebar__section-label">ПАРТНЁРЫ</div>

          <div class="tasks-sidebar__partners">
            <p v-if="!filteredPartners.length" class="tasks-sidebar__empty">
              {{ partnerSearch ? 'Ничего не найдено' : 'Партнёров нет' }}
            </p>
            <button
              v-for="partner in filteredPartners"
              :key="partner.contactId"
              type="button"
              class="tasks-partner-btn"
              :class="{ 'tasks-partner-btn--active': scopeMode === 'partner' && selectedPartnerId === partner.contactId }"
              @click="selectPartnerScope(partner.contactId)"
            >
              <span class="tasks-partner-btn__name">{{ partner.partnerName }}</span>
              <span class="tasks-partner-btn__meta">
                {{ plural(partner.taskCount, 'задача', 'задачи', 'задач') }}
              </span>
            </button>
          </div>
        </aside>

        <!-- Основная область -->
        <div class="tasks-content">
          <!-- Верхняя плашка с заголовком и кнопкой создания -->
          <div class="tasks-topline">
            <div>
              <div class="tasks-topline__eyebrow">Рабочее пространство</div>
              <h1 class="tasks-topline__title">Задачи и партнёры</h1>
            </div>
            <button
              type="button"
              class="tasks-btn-primary"
              :disabled="creating"
              @click="createTask"
            >
              {{ creating ? 'Создание…' : '+ Создать задачу' }}
            </button>
          </div>

          <!-- Глобальные табы метрик -->
          <div class="tasks-global-tabs">
            <button
              type="button"
              class="tasks-global-tab"
              :class="{ 'tasks-global-tab--active': globalFilter === 'all' }"
              @click="globalFilter = 'all'"
            >
              <span class="tasks-global-tab__label">Всего задач</span>
              <strong class="tasks-global-tab__value">{{ globalMetricCounts.all }}</strong>
            </button>
            <button
              type="button"
              class="tasks-global-tab"
              :class="{ 'tasks-global-tab--active': globalFilter === 'overdue' }"
              @click="globalFilter = 'overdue'"
            >
              <span class="tasks-global-tab__label">Просрочено</span>
              <strong class="tasks-global-tab__value tasks-global-tab__value--danger">
                {{ globalMetricCounts.overdue }}
              </strong>
            </button>
            <button
              type="button"
              class="tasks-global-tab"
              :class="{ 'tasks-global-tab--active': globalFilter === 'today' }"
              @click="globalFilter = 'today'"
            >
              <span class="tasks-global-tab__label">На сегодня</span>
              <strong class="tasks-global-tab__value">{{ globalMetricCounts.today }}</strong>
            </button>
            <button
              type="button"
              class="tasks-global-tab"
              :class="{ 'tasks-global-tab--active': globalFilter === 'pause' }"
              @click="globalFilter = 'pause'"
            >
              <span class="tasks-global-tab__label">На паузе</span>
              <strong class="tasks-global-tab__value">{{ globalMetricCounts.pause }}</strong>
            </button>
          </div>

          <!-- Карточка контекста (выбранный партнёр или раздел) -->
          <section class="tasks-context-card panel">
            <div class="tasks-context-card__header">
              <div>
                <h2 class="tasks-context-card__title">{{ contextTitle }}</h2>
                <div class="tasks-context-card__subtitle">{{ contextSubtitle }}</div>
              </div>
              <div class="tasks-context-card__total">
                <b>{{ scopedTasks.length }}</b> задач
              </div>
            </div>

            <!-- Плашки мероприятий для партнёра -->
            <div v-if="scopeMode === 'partner' && (scopedPartnerEvents.length || scopedTasks.length)" class="tasks-event-tabs">
              <button
                type="button"
                class="tasks-event-tab tasks-event-tab--simple"
                :class="{ 'tasks-event-tab--active': eventFilter === 'all' }"
                @click="eventFilter = 'all'"
              >
                <span class="tasks-event-tab__name">Все задачи партнёра</span>
                <span class="tasks-event-tab__meta">{{ scopedTasks.length }} задач</span>
              </button>
              <button
                type="button"
                class="tasks-event-tab tasks-event-tab--simple"
                :class="{ 'tasks-event-tab--active': eventFilter === 'none' }"
                @click="eventFilter = 'none'"
              >
                <span class="tasks-event-tab__name">Задачи без мероприятия</span>
                <span class="tasks-event-tab__meta">{{ scopedTasksWithoutEventCount }} задач</span>
              </button>
              <button
                v-for="event in scopedPartnerEvents"
                :key="event.id"
                type="button"
                class="tasks-event-tab"
                :class="{ 'tasks-event-tab--active': eventFilter === event.id }"
                @click="eventFilter = event.id"
              >
                <span class="tasks-event-tab__name">{{ event.title }}</span>
                <span class="tasks-event-tab__meta">
                  <span>{{ event.date || '—' }}</span>
                  <span>{{ event.taskCount }} задач</span>
                </span>
              </button>
            </div>
          </section>

          <!-- Фильтры и поиск -->
          <section class="tasks-filter-card panel">
            <div class="tasks-filter-card__row">
              <span class="tasks-filter-card__label">Фильтры</span>

              <v-autocomplete
                v-model="filterResponsible"
                :items="responsibleFilterOptions"
                item-title="title"
                item-value="id"
                placeholder="Все ответственные"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                class="tasks-filter-card__control"
              />

              <v-autocomplete
                v-model="filterStatus"
                :items="statusFilterOptions"
                item-title="title"
                item-value="id"
                placeholder="Все статусы"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                class="tasks-filter-card__control"
              />

              <button
                type="button"
                class="tasks-filter-card__reset"
                @click="resetFilters"
              >
                Сбросить фильтры
              </button>
            </div>

            <div class="tasks-filter-card__search-row">
              <div class="tasks-search-input">
                <v-icon icon="$magnify" size="18" class="tasks-search-input__icon" />
                <input
                  v-model="search"
                  type="text"
                  placeholder="Поиск по задаче, партнёру или мероприятию"
                  aria-label="Поиск задач"
                >
              </div>
              <span class="tasks-filter-card__results">
                Найдено: {{ filteredTasks.length }}
              </span>
            </div>
          </section>

          <!-- Заголовок таблицы -->
          <div class="tasks-table-heading">
            <h3 class="tasks-table-heading__title">Задачи по участию</h3>
            <span class="tasks-table-heading__today">{{ todayFormattedLabel }}</span>
          </div>

          <!-- Таблица задач -->
          <v-data-table
            :headers="headers"
            :items="filteredTasks"
            item-value="id"
            density="comfortable"
            hover
            class="report-data-table report-data-table--paginated tasks-table panel"
            :items-per-page="20"
            :items-per-page-options="[10, 20, 50, 100]"
          >
            <template #item.title="{ item }">
              <div class="tasks-cell">
                <button
                  type="button"
                  class="tasks-cell__title event-link"
                  @click="openTask(item.id)"
                >
                  {{ item.title }}
                </button>
              </div>
            </template>

            <template #item.partnerName="{ item }">
              <span class="tasks-cell__text">{{ item.partnerName || '—' }}</span>
            </template>

            <template #item.eventName="{ item }">
              <span class="tasks-cell__sub">{{ item.eventName || 'Без мероприятия' }}</span>
            </template>

            <template #item.responsibleName="{ item }">
              <div v-if="item.responsibleName" class="responsible-cell">
                <v-avatar size="28" color="primary" variant="tonal">
                  <img
                    v-if="getPhoto(item)"
                    :src="getPhoto(item)"
                    :alt="item.responsibleName"
                    class="avatar-image"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="markAvatarFailed(getPhoto(item))"
                  >
                  <span v-else class="avatar-initials">
                    {{ getInitials(item.responsibleName) }}
                  </span>
                </v-avatar>
                <span class="responsible-name">{{ item.responsibleName }}</span>
              </div>
              <span v-else class="tasks-cell__empty">—</span>
            </template>

            <template #item.deadline="{ item }">
              <span
                v-if="item.deadline"
                class="tasks-deadline"
                :class="{ 'tasks-deadline--overdue': item.overdue }"
              >
                {{ item.deadline }}
              </span>
              <span v-else class="tasks-cell__empty">—</span>
            </template>

            <template #item.status="{ item }">
              <span class="tasks-status" :class="`tasks-status--${item.statusTone}`">
                {{ item.status || '—' }}
              </span>
            </template>

            <template #no-data>
              <div class="tasks-empty-state">
                Задачи не найдены. Измените фильтры или поисковый запрос.
              </div>
            </template>
          </v-data-table>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import LoadingProgress from '../../../components/LoadingProgress.vue';
import { openBitrixPath } from '../functions/bitrixPath';
import {
  buildTaskDetailsPath,
} from '../functions/monthlyTasks';
import {
  createPartnerTask,
  loadTasksDashboard,
  type PartnerEventItem,
  type TaskPartnerRow,
  type TaskTableRow,
} from '../functions/tasksDashboard';

const isLoading = ref(true);
const loadingProgress = ref(0);
const loadingMessage = ref('Загрузка задач…');

const tasks = ref<TaskTableRow[]>([]);
const partners = ref<TaskPartnerRow[]>([]);
const partnerEvents = ref<Record<string, PartnerEventItem[]>>({});
const eventOptions = ref<Array<{ id: string; title: string }>>([]);
const responsibleOptions = ref<Array<{ id: string; name: string }>>([]);

/** Режим левого сайдбара: 'all' | 'general' | 'partner' */
const scopeMode = ref<'all' | 'general' | 'partner'>('all');
const selectedPartnerId = ref('');
const partnerSearch = ref('');
/** Фильтр по мероприятиям активного партнёра: 'all' | 'none' | '<eventId>' */
const eventFilter = ref('all');
/** Глобальный таб: 'all' | 'overdue' | 'today' | 'pause' */
const globalFilter = ref<'all' | 'overdue' | 'today' | 'pause'>('all');

/** Фильтры панели */
const search = ref('');
const filterResponsible = ref<string | null>(null);
const filterStatus = ref<string | null>(null);

const failedAvatars = ref<Set<string>>(new Set());
const creating = ref(false);

const headers = [
  { title: 'Задача', key: 'title', align: 'start' as const, sortable: false, width: '28%' },
  { title: 'Партнёр', key: 'partnerName', align: 'start' as const, sortable: false, width: '16%' },
  { title: 'Мероприятие', key: 'eventName', align: 'start' as const, sortable: false, width: '22%' },
  { title: 'Ответственный', key: 'responsibleName', align: 'start' as const, sortable: false, width: '14%' },
  { title: 'Срок', key: 'deadline', align: 'start' as const, sortable: false, width: '10%' },
  { title: 'Статус', key: 'status', align: 'start' as const, sortable: false, width: '10%' },
];

/** Сегодняшняя дата для заголовка */
const todayFormattedLabel = computed(() => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `Сегодня, ${day}.${month}.${year}`;
});

/** Количество общих задач (без партнёра) */
const generalTasksCount = computed(() =>
  tasks.value.filter((t) => !t.contactId).length);

/** Список партнёров с учётом поиска по ФИО */
const filteredPartners = computed(() => {
  const query = partnerSearch.value.trim().toLowerCase();
  if (!query) {
    return partners.value;
  }
  return partners.value.filter((p) =>
    (p.partnerName || '').toLowerCase().includes(query)
    || (p.companyName || '').toLowerCase().includes(query));
});

/** Активный партнёр по объекту */
const activePartner = computed(() =>
  partners.value.find((p) => p.contactId === selectedPartnerId.value) ?? null);

/** Заголовок блока контекста */
const contextTitle = computed(() => {
  if (scopeMode.value === 'all') {
    return 'Все задачи';
  }
  if (scopeMode.value === 'general') {
    return 'Общие задачи';
  }
  return activePartner.value?.partnerName || 'Партнёр не выбран';
});

/** Подзаголовок блока контекста */
const contextSubtitle = computed(() => {
  if (scopeMode.value === 'all') {
    return 'Общий список задач всех партнёров и команды';
  }
  if (scopeMode.value === 'general') {
    return 'Задачи, не привязанные к партнёру';
  }
  return activePartner.value?.companyName || 'Задачи и мероприятия партнёра';
});

/** Задачи в текущем скоупе (левый сайдбар) */
const scopedTasks = computed(() => {
  if (scopeMode.value === 'all') {
    return tasks.value;
  }
  if (scopeMode.value === 'general') {
    return tasks.value.filter((t) => !t.contactId);
  }
  const pid = selectedPartnerId.value;
  return tasks.value.filter((t) => t.contactId === pid);
});

/** Задачи текущего партнёра без мероприятия */
const scopedTasksWithoutEventCount = computed(() =>
  scopedTasks.value.filter((t) => !t.eventId).length);

/** Мероприятия текущего партнёра со счётчиками задач и датой */
const scopedPartnerEvents = computed(() => {
  if (scopeMode.value !== 'partner') {
    return [];
  }
  const partnerId = selectedPartnerId.value;
  const events = partnerEvents.value[partnerId] ?? [];

  // Подсчитываем задачи текущего партнёра по каждому мероприятию
  const taskCountByEvent = new Map<string, number>();
  scopedTasks.value.forEach((t) => {
    if (t.eventId) {
      taskCountByEvent.set(t.eventId, (taskCountByEvent.get(t.eventId) ?? 0) + 1);
    }
  });

  // Также учитываем мероприятия, если они есть в задачах, но вдруг отсутствуют в partnerEvents
  const knownEventIds = new Set(events.map((e) => e.id));
  const result: Array<{ id: string; title: string; date: string; taskCount: number }> = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    taskCount: taskCountByEvent.get(e.id) ?? 0,
  }));

  scopedTasks.value.forEach((t) => {
    if (t.eventId && t.eventName && !knownEventIds.has(t.eventId)) {
      knownEventIds.add(t.eventId);
      result.push({
        id: t.eventId,
        title: t.eventName,
        date: t.eventPeriod || '',
        taskCount: taskCountByEvent.get(t.eventId) ?? 1,
      });
    }
  });

  return result;
});

/** Подсчёт глобальных карточек метрик (для текущей выборки scope) */
const globalMetricCounts = computed(() => {
  const current = scopedTasks.value;
  return {
    all: current.length,
    overdue: current.filter((t) => t.overdue).length,
    today: current.filter((t) => t.isToday).length,
    pause: current.filter((t) => t.statusTone === 'muted' || t.status.toLowerCase().includes('пауз')).length,
  };
});

/** Опции для выпадающего списка ответственных */
const responsibleFilterOptions = computed(() => {
  const unique = new Map<string, string>();
  tasks.value.forEach((t) => {
    if (t.responsibleName) {
      unique.set(t.responsibleName, t.responsibleName);
    }
  });
  return [...unique.values()].map((name) => ({ id: name, title: name }));
});

/** Опции для выпадающего списка статусов */
const statusFilterOptions = computed(() => {
  const unique = new Map<string, string>();
  tasks.value.forEach((t) => {
    if (t.status) {
      unique.set(t.status, t.status);
    }
  });
  return [...unique.values()].map((st) => ({ id: st, title: st }));
});

/** Отфильтрованные задачи для таблицы */
const filteredTasks = computed(() => {
  const query = search.value.trim().toLowerCase();
  const resp = filterResponsible.value;
  const stat = filterStatus.value;
  const gf = globalFilter.value;
  const ef = eventFilter.value;

  return scopedTasks.value.filter((t) => {
    // 1. Глобальный таб
    if (gf === 'overdue' && !t.overdue) {
      return false;
    }
    if (gf === 'today' && !t.isToday) {
      return false;
    }
    if (gf === 'pause' && !(t.statusTone === 'muted' || t.status.toLowerCase().includes('пауз'))) {
      return false;
    }

    // 2. Мероприятие
    if (scopeMode.value === 'partner') {
      if (ef === 'none' && t.eventId) {
        return false;
      }
      if (ef !== 'all' && ef !== 'none' && t.eventId !== ef) {
        return false;
      }
    }

    // 3. Выпадающие фильтры
    if (resp && t.responsibleName !== resp) {
      return false;
    }
    if (stat && t.status !== stat) {
      return false;
    }

    // 4. Текстовый поиск
    if (query) {
      const match = (t.title || '').toLowerCase().includes(query)
        || (t.partnerName || '').toLowerCase().includes(query)
        || (t.eventName || '').toLowerCase().includes(query)
        || (t.responsibleName || '').toLowerCase().includes(query);
      if (!match) {
        return false;
      }
    }

    return true;
  });
});

function setScope(mode: 'all' | 'general') {
  scopeMode.value = mode;
  eventFilter.value = 'all';
}

function selectPartnerScope(contactId: string) {
  scopeMode.value = 'partner';
  selectedPartnerId.value = contactId;
  eventFilter.value = 'all';
}

function resetFilters() {
  search.value = '';
  filterResponsible.value = null;
  filterStatus.value = null;
  globalFilter.value = 'all';
  eventFilter.value = 'all';
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = many;
  if (mod10 === 1 && mod100 !== 11) {
    word = one;
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    word = few;
  }
  return `${count} ${word}`;
}

function getPhoto(item: TaskTableRow): string {
  const url = item.responsiblePhoto ?? '';
  if (!url || failedAvatars.value.has(url)) {
    return '';
  }
  return url;
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

function openTask(taskId: string) {
  openBitrixPath(buildTaskDetailsPath(taskId));
}

/**
 * Создание задачи одной кнопкой с сохранением в Bitrix и последующим открытием.
 */
async function createTask() {
  if (creating.value) {
    return;
  }

  // Привязка к партнёру учитывается только если активен выбор конкретного партнёра
  const isPartnerScope = scopeMode.value === 'partner';
  const partner = isPartnerScope ? activePartner.value : null;
  const eventId = isPartnerScope && (eventFilter.value.startsWith('e') || /^\d+$/.test(eventFilter.value))
    ? eventFilter.value
    : undefined;
  const eventObj = eventId ? scopedPartnerEvents.value.find((e) => e.id === eventId) : null;

  let title = 'Новая задача';
  if (partner && eventObj) {
    title = `Задача по мероприятию «${eventObj.title}» — ${partner.partnerName}`;
  } else if (partner) {
    title = `Задача по партнёру «${partner.partnerName}»`;
  }

  creating.value = true;
  try {
    const created = await createPartnerTask({
      title,
      contactId: partner?.contactId,
      eventId: eventObj?.id,
    });

    openBitrixPath(buildTaskDetailsPath(created.id), () => {
      void loadData();
    });
  } catch (error) {
    console.error('Не удалось создать задачу:', error);
    window.alert(error instanceof Error ? error.message : 'Не удалось создать задачу');
  } finally {
    creating.value = false;
  }
}

async function loadData() {
  isLoading.value = true;
  loadingProgress.value = 20;
  loadingMessage.value = 'Загрузка задач…';

  try {
    const data = await loadTasksDashboard();
    loadingProgress.value = 80;
    tasks.value = data.tasks;
    partners.value = data.partners;
    partnerEvents.value = data.partnerEvents || {};
    eventOptions.value = data.events;
    responsibleOptions.value = data.responsibles;
    if (data.partners.length && !selectedPartnerId.value) {
      selectedPartnerId.value = data.partners[0].contactId;
    }
    loadingProgress.value = 100;
    loadingMessage.value = 'Готово';
    window.setTimeout(() => {
      isLoading.value = false;
    }, 150);
  } catch (error) {
    console.error('Не удалось загрузить задачи:', error);
    loadingProgress.value = 100;
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadData();
});

defineExpose({ reload: loadData });
</script>

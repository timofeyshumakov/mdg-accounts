<template>
  <section class="monthly-tab-panel">
    <div class="monthly-tab-panel__head">
      <div class="monthly-tab-panel__titles">
        <h3 class="monthly-tab-panel__title">{{ title }}</h3>
        <p v-if="hint" class="monthly-tab-panel__hint">{{ hint }}</p>
      </div>
    </div>

    <p v-if="loading" class="monthly-tab-panel__empty">Загрузка мероприятий…</p>
    <p v-else-if="!filteredItems.length" class="monthly-tab-panel__empty">
      {{ items.length ? 'Ничего не найдено по фильтру.' : emptyLabel }}
    </p>
    <v-data-table
      v-else
      :headers="tableHeaders"
      :items="filteredItems"
      item-value="id"
      density="comfortable"
      hover
      class="report-data-table report-data-table--paginated activity-report-table monthly-report-table"
      :items-per-page="25"
    >
      <template #item.title="{ item }">
        <button
          type="button"
          class="monthly-table__partner-name event-link"
          @click="openItem(item)"
        >
          {{ item.title }}
        </button>
      </template>
      <template #item.assigned="{ item }">
        <div v-if="item.assigned" class="responsible-cell">
          <v-avatar size="28" color="primary" variant="tonal">
            <img
              v-if="getUserPhoto(item)"
              :src="getUserPhoto(item)"
              :alt="item.assigned"
              class="avatar-image"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="markAvatarFailed(getUserPhoto(item))"
            >
            <span v-else class="avatar-initials">
              {{ getUserInitials(item.assigned) }}
            </span>
          </v-avatar>
          <span class="responsible-name" :title="item.assigned">
            {{ item.assigned }}
          </span>
        </div>
        <span v-else class="monthly-table__text monthly-table__text--empty">—</span>
      </template>
      <template
        v-for="column in textColumns"
        #[`item.${column.key}`]="{ item }"
        :key="column.key"
      >
        <span
          class="monthly-table__text"
          :class="{
            'monthly-table__text--empty': !item[column.key],
            'monthly-table__text--wrap': column.wrap,
            'monthly-table__text--nowrap': !column.wrap,
          }"
        >
          {{ item[column.key] || '—' }}
        </span>
      </template>
    </v-data-table>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { openBitrixPath } from '../functions/bitrixPath';
import type { EventTableRow } from '../functions/monthlyEvents';
import type { MonthlyReportPeriod } from '../functions/monthlyReportSubmit';

export interface EventColumn {
  key: keyof EventTableRow;
  title: string;
  align?: 'start' | 'center';
  /** Переносить длинные значения по словам вместо одной строки. */
  wrap?: boolean;
}

const props = defineProps<{
  title: string;
  /** Подпись под заголовком — необязательна. */
  hint?: string;
  emptyLabel: string;
  /** Колонки таблицы (без «Название» — она всегда первая и кликабельная). */
  columns: EventColumn[];
  detailsPath: (eventId: string) => string;
  /** Загрузчик с фильтром по выбранному месяцу. */
  loader: (period: MonthlyReportPeriod) => Promise<EventTableRow[]>;
  /** Месяц/год из фильтров отчёта. */
  period: MonthlyReportPeriod;
  /** Выбранные сотрудники из общего фильтра отчёта (пусто — все). */
  assignedIds?: string[];
}>();

const items = ref<EventTableRow[]>([]);
const loading = ref(false);
const search = ref('');
/** Ссылки на фото, которые не загрузились, — чтобы показать инициалы. */
const failedAvatars = ref<Set<string>>(new Set());

/** Колонки-текст (кроме «Ответственный» — у него свой шаблон с аватаром). */
const textColumns = computed(() =>
  props.columns.filter((column) => column.key !== 'assigned'));

const tableHeaders = computed(() => [
  { title: 'Название', key: 'title', align: 'start' as const, sortable: false },
  ...props.columns.map((column) => ({
    title: column.title,
    key: column.key,
    align: column.align ?? ('start' as const),
    sortable: false,
  })),
]);

const periodKey = computed(() => `${props.period.year}-${props.period.month}`);

const filteredItems = computed(() => {
  const query = search.value.trim().toLowerCase();
  const assigned = props.assignedIds ?? [];
  const selected = new Set(assigned.map(String));

  return items.value.filter((item) => {
    // Фильтр «Сотрудник»: у мероприятия может быть несколько менеджеров.
    // Если менеджеры не указаны, в выборку попадает только при пустом фильтре.
    if (selected.size) {
      const managers = item.managerIds ?? [];
      if (!managers.some((id) => selected.has(String(id)))) {
        return false;
      }
    }
    if (!query) {
      return true;
    }
    return item.title.toLowerCase().includes(query)
      || String(item.company ?? '').toLowerCase().includes(query);
  });
});

/** Фото ответственного, если оно есть и ещё не падало с ошибкой. */
function getUserPhoto(item: EventTableRow): string {
  const url = item.assignedPhoto ?? '';
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

/** Инициалы для заглушки аватара: «Ступникова Мария» → «СМ». */
function getUserInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function openItem(item: EventTableRow) {
  if (!item.id) {
    return;
  }
  openBitrixPath(props.detailsPath(item.id));
}

async function reload() {
  loading.value = true;
  try {
    items.value = await props.loader(props.period);
  } finally {
    loading.value = false;
  }
}

watch(periodKey, () => {
  void reload();
}, { immediate: true });

defineExpose({ reload });
</script>

<style scoped>
/* Перенос длинных значений (тип, город, стадия, нозология) по словам. */
.monthly-table__text--wrap {
  display: block;
  min-width: 8rem;
  max-width: 18rem;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: normal;
  hyphens: auto;
  line-height: 1.35;
}

/* Даты всегда в одну строку — не переносим по точкам. */
.monthly-table__text--nowrap {
  display: inline-block;
  white-space: nowrap;
}

/* Ответственный: аватар с фото + ФИО с переносом. */
.responsible-cell {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  max-width: 100%;
}

.responsible-cell .v-avatar {
  flex-shrink: 0;
  align-self: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 0.65rem;
  font-weight: 800;
  line-height: 1;
}

.responsible-name {
  flex: 1;
  min-width: 0;
  color: #1f2937;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: normal;
  line-height: 1.35;
}
</style>

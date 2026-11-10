<template>
  <section class="monthly-tab-panel">
    <div class="monthly-tab-panel__head">
      <div class="monthly-tab-panel__titles">
        <h3 class="monthly-tab-panel__title">{{ title }}</h3>
        <p v-if="hint" class="monthly-tab-panel__hint">{{ hint }}</p>
      </div>
      <div class="monthly-tab-panel__actions">
        <button
          type="button"
          class="monthly-summary__btn"
          @click="openCreateForm"
        >
          {{ createLabel }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="monthly-tab-panel__empty">{{ loadingLabel }}</p>
    <p v-else-if="!items.length" class="monthly-tab-panel__empty">{{ emptyLabel }}</p>
    <v-data-table
      v-else
      :headers="tableHeaders"
      :items="visibleItems"
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
          {{ item.title || 'Без названия' }}
        </button>
      </template>
      <template #item.assignedName="{ item }">
        <div v-if="item.assignedName" class="responsible-cell">
          <v-avatar size="28" color="primary" variant="tonal">
            <img
              v-if="getPhoto(item)"
              :src="getPhoto(item)"
              :alt="item.assignedName"
              class="avatar-image"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="markAvatarFailed(getPhoto(item))"
            >
            <span v-else class="avatar-initials">
              {{ getInitials(String(item.assignedName)) }}
            </span>
          </v-avatar>
          <span class="responsible-name">{{ item.assignedName }}</span>
        </div>
        <span v-else class="monthly-table__text monthly-table__text--empty">—</span>
      </template>
      <template
        v-for="column in dataColumns"
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
import { computed, onMounted, ref } from 'vue';
import { openBitrixPath } from '../functions/bitrixPath';
import type { MonthlyPlanItem } from '../functions/monthlySummary';

export interface SpColumn {
  key: string;
  title: string;
  align?: 'start' | 'center';
  /** Переносить длинные значения по словам. */
  wrap?: boolean;
  /** Ширина колонки в px. */
  width?: number;
}

type SpRow = MonthlyPlanItem & Record<string, unknown>;

const props = defineProps<{
  title: string;
  /** Подпись под заголовком — необязательна. */
  hint?: string;
  /** Подпись кнопки создания. */
  createLabel: string;
  /** Путь к форме создания в Bitrix24 (details/0/). */
  createPath: string;
  /** Подсказка во время загрузки / для пустого списка. */
  loadingLabel: string;
  emptyLabel: string;
  /** Колонки таблицы. */
  columns: SpColumn[];
  loader: () => Promise<SpRow[]>;
  detailsPath: (itemId: string) => string;
  /** Выбранные сотрудники из общего фильтра отчёта (пусто — все). */
  assignedIds?: string[];
  /**
   * Выбранные месяцы (номера 1–12) из фильтра отчёта.
   * Применяется только к записям, у которых есть поле «Месяц» (план по контактам).
   */
  months?: number[];
}>();

const items = ref<SpRow[]>([]);
const loading = ref(false);
const failedAvatars = ref<Set<string>>(new Set());

const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

/** Записи с учётом фильтров «Сотрудник» и «Месяц» из общего фильтра отчёта. */
const visibleItems = computed(() => {
  const assigned = props.assignedIds ?? [];
  const months = props.months ?? [];
  const selectedUsers = new Set(assigned.map(String));
  const selectedMonths = new Set(
    months.map((month) => String(MONTH_NAMES[Number(month) - 1] ?? '').toLowerCase()),
  );

  return items.value.filter((item) => {
    if (selectedUsers.size && !selectedUsers.has(String(item.assignedId ?? ''))) {
      return false;
    }
    // Поле «Месяц» есть только у плана по контактам; у болей его нет.
    const rowMonth = typeof item.month === 'string' ? item.month.trim().toLowerCase() : '';
    if (selectedMonths.size && rowMonth) {
      return selectedMonths.has(rowMonth);
    }
    return true;
  });
});

const dataColumns = computed(() =>
  props.columns.filter((column) => column.key !== 'title' && column.key !== 'assignedName'));

const tableHeaders = computed(() => props.columns.map((column) => ({
  title: column.title,
  key: column.key,
  align: column.align ?? ('start' as const),
  sortable: false,
  ...(column.width ? { width: column.width } : {}),
})));

/** Фото ответственного, если есть и ещё не падало с ошибкой. */
function getPhoto(item: SpRow): string {
  const url = typeof item.assignedPhoto === 'string' ? item.assignedPhoto : '';
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

/** Открывает карточку элемента. */
function openItem(item: SpRow) {
  openBitrixPath(props.detailsPath(item.id));
}

/** Создание — штатная форма Bitrix24, после закрытия перечитываем список. */
function openCreateForm() {
  openBitrixPath(props.createPath, () => {
    void reload();
  });
}

async function reload() {
  loading.value = true;
  try {
    items.value = await props.loader();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void reload();
});

defineExpose({ reload });
</script>

<style scoped>
/* Перенос длинных значений по словам; остальные — в одну строку. */
.monthly-table__text--wrap {
  display: block;
  min-width: 8rem;
  max-width: 18rem;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: normal;
  line-height: 1.35;
}

.monthly-table__text--nowrap {
  display: inline-block;
  white-space: nowrap;
}

/* Ответственный: аватар с фото + имя. */
.responsible-cell {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  max-width: 100%;
}

.responsible-cell .v-avatar {
  flex-shrink: 0;
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
  line-height: 1.35;
}
</style>

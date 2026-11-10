<template>
  <section class="monthly-tab-panel">
    <div class="monthly-tab-panel__head">
      <div class="monthly-tab-panel__titles">
        <h3 class="monthly-tab-panel__title">Краткое резюме месяца</h3>
        <p class="monthly-tab-panel__hint">
          Заполняется в 3–5 предложениях. Что изменилось за месяц и где есть движение?
        </p>
      </div>
      <div class="monthly-tab-panel__actions">
        <button
          type="button"
          class="monthly-summary__btn"
          @click="openCreateForm"
        >
          Создать резюме
        </button>
      </div>
    </div>

    <p v-if="loading" class="monthly-tab-panel__empty">Загрузка резюме…</p>
    <p v-else-if="!items.length" class="monthly-tab-panel__empty">
      Резюме за выбранный период ещё не создано.
    </p>
    <v-data-table
      v-else
      :headers="headers"
      :items="visibleItems"
      item-value="id"
      density="comfortable"
      hover
      class="report-data-table report-data-table--paginated activity-report-table monthly-report-table"
      :items-per-page="25"
    >
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
              {{ getInitials(item.assignedName) }}
            </span>
          </v-avatar>
          <span class="responsible-name">{{ item.assignedName }}</span>
        </div>
        <span v-else class="monthly-table__text monthly-table__text--empty">—</span>
      </template>

      <template #item.title="{ item }">
        <button
          type="button"
          class="monthly-table__partner-name event-link"
          :title="item.text || item.title"
          @click="openItem(item)"
        >
          {{ item.title || 'Без названия' }}
        </button>
      </template>

      <template #item.created="{ item }">
        <span class="monthly-table__text" :class="{ 'monthly-table__text--empty': !item.created }">
          {{ item.created || '—' }}
        </span>
      </template>
    </v-data-table>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { openBitrixPath } from '../functions/bitrixPath';
import {
  buildMonthlySummaryDetailsPath,
  loadMonthlySummaries,
  MONTHLY_SUMMARY_CREATE_PATH,
  type MonthlySummaryItem,
} from '../functions/monthlySummary';

const props = defineProps<{
  period: { month: number; year: string };
  /** Выбранные сотрудники из общего фильтра отчёта (пусто — все). */
  assignedIds?: string[];
}>();

const items = ref<MonthlySummaryItem[]>([]);
const loading = ref(false);
const failedAvatars = ref<Set<string>>(new Set());

/** Резюме с учётом фильтра «Сотрудник». */
const visibleItems = computed(() => {
  const assigned = props.assignedIds ?? [];
  if (!assigned.length) {
    return items.value;
  }
  const selected = new Set(assigned.map(String));
  return items.value.filter((item) => selected.has(String(item.assignedId ?? '')));
});

const headers = [
  { title: 'Сотрудник', key: 'assignedName', align: 'start' as const, sortable: false },
  { title: 'Название', key: 'title', align: 'start' as const, sortable: false },
  { title: 'Дата создания', key: 'created', align: 'center' as const, sortable: false },
];

const periodKey = computed(() => `${props.period.year}-${props.period.month}`);

async function reload() {
  loading.value = true;
  try {
    items.value = await loadMonthlySummaries(props.period);
  } finally {
    loading.value = false;
  }
}

function getPhoto(item: MonthlySummaryItem): string {
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

function openItem(item: MonthlySummaryItem) {
  openBitrixPath(buildMonthlySummaryDetailsPath(item.id));
}

/** Создание — штатная форма Bitrix24, после закрытия перечитываем список. */
function openCreateForm() {
  openBitrixPath(MONTHLY_SUMMARY_CREATE_PATH, () => {
    void reload();
  });
}

watch(periodKey, () => {
  void reload();
}, { immediate: true });

defineExpose({ reload });
</script>

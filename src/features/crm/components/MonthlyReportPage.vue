<template>
  <!-- Заглушка «в разработке» — раскомментировать при необходимости
  <section class="monthly-report-stub">
    <img
      class="monthly-report-stub__image"
      :src="underConstructionSrc"
      alt="Извините, страница в разработке. Зайдите, пожалуйста, позже."
    >
  </section>
  -->

  <section class="monthly-report">
    <LoadingProgress
      :visible="isLoading"
      :message="loadingMessage"
      :model-value="loadingProgress"
      :auto-hide="false"
    />

    <template v-if="!isLoading">
      <article class="monthly-report__filters panel">
        <h3 class="monthly-report__title">Фильтры</h3>

        <div class="monthly-report__primary">
          <div class="monthly-report__field">
            <span class="monthly-report__label">Сотрудник</span>
            <v-autocomplete
              v-model="selectedAssigned"
              :items="assignedOptions"
              item-title="title"
              item-value="id"
              placeholder="Все сотрудники"
              density="compact"
              variant="outlined"
              hide-details
              multiple
              chips
              clearable
              prepend-inner-icon="$accountOutline"
            >
              <template #prepend-item>
                <v-list-item>
                  <v-checkbox
                    :model-value="isAllSelected(selectedAssigned, assignedOptions)"
                    label="Выбрать всех"
                    hide-details
                    density="compact"
                    :disabled="!assignedOptions.length"
                    @update:model-value="toggleAllAssigned($event)"
                  />
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>
          <div class="monthly-report__field">
            <span class="monthly-report__label">Месяц</span>
            <v-autocomplete
              v-model="selectedMonths"
              :items="monthOptions"
              item-title="title"
              item-value="id"
              placeholder="Все месяцы"
              density="compact"
              variant="outlined"
              hide-details
              multiple
              chips
              clearable
              prepend-inner-icon="$calendarMonthOutline"
            >
              <template #prepend-item>
                <v-list-item>
                  <v-checkbox
                    :model-value="isAllSelected(selectedMonths, monthOptions)"
                    label="Выбрать все"
                    hide-details
                    density="compact"
                    @update:model-value="toggleAllMonths($event)"
                  />
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>
          <div class="monthly-report__field">
            <span class="monthly-report__label">Год</span>
            <v-autocomplete
              v-model="selectedYears"
              :items="yearOptions"
              item-title="title"
              item-value="id"
              placeholder="Все годы"
              density="compact"
              variant="outlined"
              hide-details
              multiple
              chips
              clearable
              prepend-inner-icon="$calendarOutline"
            >
              <template #prepend-item>
                <v-list-item>
                  <v-checkbox
                    :model-value="isAllSelected(selectedYears, yearOptions)"
                    label="Выбрать все"
                    hide-details
                    density="compact"
                    :disabled="!yearOptions.length"
                    @update:model-value="toggleAllYears($event)"
                  />
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>
        </div>

        <div class="monthly-filters-row">
          <div class="monthly-filter-groups">
            <article class="monthly-filter-card">
              <h4 class="monthly-filter-card__title">Тип партнера</h4>
              <div class="monthly-filter-card__chips">
                <button
                  v-for="chip in partnerTypeChips"
                  :key="chip.id"
                  type="button"
                  class="monthly-chip"
                  :class="{ 'monthly-chip--active': selectedPartnerTypes.includes(chip.id) }"
                  @click="toggleChip(selectedPartnerTypes, chip.id)"
                >
                  <span class="monthly-chip__label">{{ chip.label }}</span>
                  <span class="monthly-chip__count">{{ chip.count }}</span>
                </button>
              </div>
            </article>

            <article class="monthly-filter-card">
              <h4 class="monthly-filter-card__title">Статус отношений</h4>
              <div class="monthly-filter-card__chips">
                <button
                  v-for="chip in relationStatusChips"
                  :key="chip.id"
                  type="button"
                  class="monthly-chip"
                  :class="{ 'monthly-chip--active': selectedRelationStatuses.includes(chip.id) }"
                  @click="toggleChip(selectedRelationStatuses, chip.id)"
                >
                  <span class="monthly-chip__label">{{ chip.label }}</span>
                  <span class="monthly-chip__count">{{ chip.count }}</span>
                </button>
              </div>
            </article>

            <article class="monthly-filter-card">
              <h4 class="monthly-filter-card__title">Текущий статус</h4>
              <div class="monthly-filter-card__chips">
                <button
                  v-for="chip in currentStatusChips"
                  :key="chip.id"
                  type="button"
                  class="monthly-chip"
                  :class="{ 'monthly-chip--active': selectedCurrentStatuses.includes(chip.id) }"
                  @click="toggleChip(selectedCurrentStatuses, chip.id)"
                >
                  <span class="monthly-chip__label">{{ chip.label }}</span>
                  <span class="monthly-chip__count">{{ chip.count }}</span>
                </button>
              </div>
            </article>
          </div>

          <article class="monthly-insights panel">
            <h4 class="monthly-insights__title">Развитие и рыночные инсайты</h4>
            <div class="monthly-insights__list">
              <button
                v-for="link in insightLinks"
                :key="link.id"
                type="button"
                class="monthly-insights__item"
                @click="onInsightClick(link)"
              >
                <span>{{ link.title }}</span>
                <v-icon icon="$chevronRight" size="18" />
              </button>
            </div>
          </article>
        </div>
      </article>

      <section class="monthly-stats">
        <button
          type="button"
          class="monthly-stats__card monthly-stats__card--total"
          :class="{ 'monthly-stats__card--active': attentionFilter === 'all' }"
          @click="attentionFilter = 'all'"
        >
          <span class="monthly-stats__icon monthly-stats__icon--total">
            <v-icon icon="$accountGroupOutline" size="22" />
          </span>
          <div class="monthly-stats__body">
            <span class="monthly-stats__label">Всего партнеров</span>
            <strong class="monthly-stats__value">{{ stats.total }}</strong>
          </div>
        </button>

        <button
          type="button"
          class="monthly-stats__card monthly-stats__card--warning"
          :class="{ 'monthly-stats__card--active': attentionFilter === 'no-touches' }"
          @click="toggleAttentionFilter('no-touches')"
        >
          <span class="monthly-stats__icon monthly-stats__icon--warning">
            <v-icon icon="$alert" size="22" />
          </span>
          <div class="monthly-stats__body">
            <span class="monthly-stats__label">Нет касаний</span>
            <strong class="monthly-stats__value monthly-stats__value--warning">{{ stats.noTouches }}</strong>
            <span class="monthly-stats__badge monthly-stats__badge--warning">Требует внимания</span>
          </div>
        </button>

        <button
          type="button"
          class="monthly-stats__card monthly-stats__card--danger"
          :class="{ 'monthly-stats__card--active': attentionFilter === 'no-next-step' }"
          @click="toggleAttentionFilter('no-next-step')"
        >
          <span class="monthly-stats__icon monthly-stats__icon--danger">
            <v-icon icon="$alert" size="22" />
          </span>
          <div class="monthly-stats__body">
            <span class="monthly-stats__label">Нет следующего шага</span>
            <strong class="monthly-stats__value monthly-stats__value--danger">{{ stats.noNextStep }}</strong>
            <span class="monthly-stats__badge monthly-stats__badge--danger">Требует внимания</span>
          </div>
        </button>
      </section>

      <div class="monthly-report__search panel">
        <v-text-field
          v-model="search"
          placeholder="Поиск по ФИО, организации"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="$magnify"
        />
      </div>

      <section class="report-table-section">
        <v-card class="report-table-card report-table-card--sticky panel monthly-report-table-card">
          <v-card-title class="report-table-title">
            {{ tableTitle }}
            <span class="monthly-report__table-count">{{ filteredRows.length }}</span>
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
            <template #item.partner="{ item }">
              <div class="event-cell">
                <div class="event-cell__title-row">
                  <button
                    type="button"
                    class="monthly-table__partner-name event-link"
                    @click="openContact(item.id)"
                  >
                    {{ item.partnerName }}<template v-if="item.organization">, {{ item.organization }}</template>
                  </button>
                </div>
                <button
                  type="button"
                  class="event-link event-link--secondary"
                  @click="openReports(item)"
                >
                  Все встречи / отчёты
                </button>
              </div>
            </template>

            <template #item.nosologies="{ item }">
              <button
                type="button"
                class="monthly-table__text"
                :class="{ 'monthly-table__text--empty': !item.nosologies }"
                @click="openFieldEditor(item, 'nosologies')"
              >
                {{ item.nosologies || '—' }}
              </button>
            </template>

            <template #item.relationStatus="{ item }">
              <div class="monthly-table__edit" @click.stop>
                <v-autocomplete
                  :model-value="item.relationStatusId || null"
                  :items="relationStatusOptions"
                  item-title="title"
                  item-value="id"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  placeholder="Статус отношений"
                  class="monthly-table__input"
                  :menu-props="{ maxHeight: 280 }"
                  @update:model-value="onRelationStatusChange(item, $event)"
                />
              </div>
            </template>

            <template #item.interest="{ item }">
              <div
                v-if="editingCell?.rowId === item.id && editingCell.field === 'interest'"
                class="monthly-table__edit"
              >
                <v-textarea
                  v-model="item.interest"
                  density="compact"
                  variant="outlined"
                  hide-details
                  rows="2"
                  auto-grow
                  autofocus
                  placeholder="Чем интересен"
                  class="monthly-table__input"
                  @blur="onInterestBlur(item)"
                  @keydown.enter.exact.prevent="onInterestBlur(item)"
                />
              </div>
              <button
                v-else
                type="button"
                class="monthly-table__field monthly-table__field--left"
                :class="{ 'monthly-table__field--empty': !item.interest }"
                @click="startEditing(item.id, 'interest')"
              >
                {{ item.interest }}
              </button>
            </template>

            <template #item.agreementLink="{ item }">
              <button
                type="button"
                class="event-link"
                @click="openInNewWindow(item.agreementLink)"
              >
                Открыть
              </button>
            </template>

            <template #item.ourEventsLink="{ item }">
              <button
                type="button"
                class="event-link"
                @click="openLink(item.ourEventsLink)"
              >
                Открыть
              </button>
            </template>

            <template #item.competitorEventsLink="{ item }">
              <button
                type="button"
                class="event-link"
                @click="openLink(item.competitorEventsLink)"
              >
                Открыть
              </button>
            </template>

            <template #item.calls="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'calls')"
              >
                <strong>{{ touchCount(item, 'calls') }}</strong>
              </button>
            </template>

            <template #item.emails="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'emails')"
              >
                <strong>{{ touchCount(item, 'emails') }}</strong>
              </button>
            </template>

            <template #item.meetings="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'meetings')"
              >
                <strong>{{ touchCount(item, 'meetings') }}</strong>
              </button>
            </template>

            <template #item.currentStatus="{ item }">
              <div class="monthly-table__edit" @click.stop>
                <v-autocomplete
                  :model-value="item.currentStatusId || null"
                  :items="currentStatusOptions"
                  item-title="title"
                  item-value="id"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  placeholder="Текущий статус"
                  class="monthly-table__input"
                  :menu-props="{ maxHeight: 280 }"
                  @update:model-value="onCurrentStatusChange(item, $event)"
                />
              </div>
            </template>

            <template #item.comment="{ item }">
              <v-textarea
                v-model="item.comment"
                density="compact"
                variant="outlined"
                hide-details
                rows="2"
                auto-grow
                class="monthly-table__input"
                @click.stop
              />
            </template>

            <template #item.nextStep="{ item }">
              <v-textarea
                v-model="item.nextStep"
                density="compact"
                variant="outlined"
                hide-details
                rows="2"
                auto-grow
                class="monthly-table__input"
                @click.stop
              />
            </template>

            <template #item.tasks="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTasksDialog(item)"
              >
                <strong>{{ item.tasks }}</strong>
              </button>
            </template>

            <template #item.actions="{ item }">
              <div class="event-actions">
                <v-btn
                  color="primary"
                  size="small"
                  variant="flat"
                  class="monthly-table__send"
                  :loading="sendingRowId === item.id"
                  :disabled="Boolean(sendingRowId)"
                  @click="submitRow(item)"
                >
                  Отправить
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </section>

      <MonthlyTouchesDialog
        v-model="touchesDialogOpen"
        :partner-name="touchesDialogPartner"
        :touches="touchesDialogItems"
        :kind="touchesDialogKind"
        :months="touchesPeriod.months"
        :years="touchesPeriod.years"
        @open-touch="openTouchItem"
      />

      <MonthlyTasksDialog
        v-model="tasksDialogOpen"
        :partner-name="tasksDialogPartner"
        :tasks="tasksDialogItems"
        @open-task="openTaskItem"
      />

      <MonthlyFieldEditDialog
        v-model="fieldEditorOpen"
        :title="fieldEditorTitle"
        :partner-name="fieldEditorPartner"
        :placeholder="fieldEditorPlaceholder"
        :options="fieldEditorOptions"
        multiple
        :model-ids="fieldEditorIds"
        start-editing
        :saving="savingCell"
        @save="onFieldEditorSave"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, type Ref, watch } from 'vue';
import LoadingProgress from '../../../components/LoadingProgress.vue';
import type { FilterOption } from '../functions/crmFilters';
import { runWhenBx24Ready } from '../functions/bitrixReady';
import { openBitrixPath, openBitrixPathInNewWindow, buildContactDetailsPath } from '../functions/bitrixPath';
import { loadMonthlyReportData, resolvePartnerTypeId } from '../functions/monthlyReport';
import {
  buildMonthlyReportSpaDetailsPath,
  buildMonthlyReportSpaListPath,
  createMonthlyReportSpaItem,
  resolveReportPeriod,
} from '../functions/monthlyReportSubmit';
import {
  buildTouchDetailsPath,
  countTouchesByKind,
  resolveTouchesPeriod,
} from '../functions/monthlyTouches';
import {
  updateContactCurrentStatus,
  updateContactInterest,
  updateContactNosologies,
  updateContactRelationStatus,
} from '../functions/monthlyContactEdit';
import {
  buildTaskDetailsPath,
  type MonthlyTaskItem,
} from '../functions/monthlyTasks';
import MonthlyTouchesDialog from './MonthlyTouchesDialog.vue';
import MonthlyTasksDialog from './MonthlyTasksDialog.vue';
import MonthlyFieldEditDialog from './MonthlyFieldEditDialog.vue';
import {
  filterMonthlyReportRows,
  filterMonthlyReportRowsForChipCounts,
  hasNextStep,
  hasTouchesInPeriod,
  monthlyMonthOptions,
  monthlyYearOptions,
  recountChips,
  type MonthlyChipOption,
  type MonthlyReportRow,
  type MonthlyTouchItem,
  type TouchKind,
} from '../mock/monthlyReportData';
import { useStickyReportTableHeaders } from '../../../composables/useStickyReportTableHeaders';
// import underConstructionSrc from '../assets/under-construction.png';

const {
  mountStickyReportTableHeaders,
  refreshStickyReportTableHeaders,
  unmountStickyReportTableHeaders,
} = useStickyReportTableHeaders();

const props = defineProps<{
  assignedOptions: FilterOption[];
}>();

const isLoading = ref(true);
const loadingProgress = ref(0);
const loadingMessage = ref('Загрузка партнёров…');
const rows = ref<MonthlyReportRow[]>([]);
const partnerTypeChipDefs = ref<MonthlyChipOption[]>([
  { id: 'active', label: 'Действующие партнеры', count: 0 },
  { id: 'new', label: 'Новые партнеры', count: 0 },
]);
const relationStatusChipDefs = ref<MonthlyChipOption[]>([]);
const relationStatusOptions = ref<Array<{ id: string; title: string }>>([]);
const currentStatusChipDefs = ref<MonthlyChipOption[]>([]);
const nosologyOptions = ref<Array<{ id: string; title: string }>>([]);

const search = ref('');
const selectedAssigned = ref<string[]>([]);
const selectedMonths = ref<number[]>([]);
const selectedYears = ref<string[]>([]);
const selectedPartnerTypes = ref<string[]>([]);
const selectedRelationStatuses = ref<string[]>([]);
const selectedCurrentStatuses = ref<string[]>([]);

const touchesDialogOpen = ref(false);
const touchesDialogPartner = ref('');
const touchesDialogItems = ref<MonthlyTouchItem[]>([]);
const touchesDialogKind = ref<TouchKind | null>(null);
const tasksDialogOpen = ref(false);
const tasksDialogPartner = ref('');
const tasksDialogItems = ref<MonthlyTaskItem[]>([]);
const sendingRowId = ref<string | null>(null);
const submitError = ref('');
const attentionFilter = ref<'all' | 'no-touches' | 'no-next-step'>('all');

const insightLinks = [
  {
    id: 'plan',
    title: 'План по привлечению и развитию контактов',
    path: '/crm/type/1262/list/category/0/',
  },
  {
    id: 'competitor',
    title: 'Конкурентные мероприятия и наблюдения',
    path: '/crm/type/1210/list/category/0/',
  },
  {
    id: 'pain',
    title: 'Боли и предложения по улучшению',
    path: '/crm/type/1266/list/category/0/',
  },
] as const;

const editingCell = ref<{ rowId: string; field: 'interest' } | null>(null);
const savingCell = ref(false);

type FieldEditorKind = 'nosologies';

const fieldEditorOpen = ref(false);
const fieldEditorKind = ref<FieldEditorKind>('nosologies');
const fieldEditorRow = ref<MonthlyReportRow | null>(null);
const fieldEditorPartner = ref('');
const fieldEditorIds = ref<string[]>([]);

const monthOptions = monthlyMonthOptions;
const yearOptions = monthlyYearOptions;

const headers = [
  { title: 'Партнер', key: 'partner', align: 'start' as const, sortable: false },
  { title: 'Нозологии', key: 'nosologies', align: 'center' as const, sortable: false },
  { title: 'Статус отношений', key: 'relationStatus', align: 'center' as const, sortable: false },
  { title: 'Чем интересен', key: 'interest', align: 'start' as const, sortable: false },
  { title: 'Формирование договоренности', key: 'agreementLink', align: 'center' as const, sortable: false },
  {
    title: 'Мероприятия',
    key: 'events',
    align: 'center' as const,
    sortable: false,
    children: [
      { title: 'Наши', key: 'ourEventsLink', align: 'center' as const, sortable: false },
      { title: 'Конкурентов', key: 'competitorEventsLink', align: 'center' as const, sortable: false },
    ],
  },
  {
    title: 'Касаний за месяц',
    key: 'touches',
    align: 'center' as const,
    sortable: false,
    children: [
      { title: 'Звонки', key: 'calls', align: 'center' as const, sortable: false },
      { title: 'Письма', key: 'emails', align: 'center' as const, sortable: false },
      { title: 'Встречи', key: 'meetings', align: 'center' as const, sortable: false },
    ],
  },
  { title: 'Текущий статус', key: 'currentStatus', align: 'center' as const, sortable: false },
  { title: 'Комментарий', key: 'comment', align: 'start' as const, sortable: false },
  { title: 'Следующий шаг', key: 'nextStep', align: 'start' as const, sortable: false },
  { title: 'Задачи', key: 'tasks', align: 'center' as const, sortable: false },
  { title: 'Действия', key: 'actions', align: 'center' as const, sortable: false },
];

const listFilterParams = computed(() => ({
  search: search.value,
  assignedIds: selectedAssigned.value,
  months: selectedMonths.value,
  years: selectedYears.value,
  partnerTypes: selectedPartnerTypes.value,
  relationStatuses: selectedRelationStatuses.value,
  currentStatuses: selectedCurrentStatuses.value,
}));

const baseFilteredRows = computed(() => filterMonthlyReportRows(rows.value, listFilterParams.value));

const touchesPeriod = computed(() =>
  resolveTouchesPeriod(selectedMonths.value, selectedYears.value),
);

const stats = computed(() => {
  const list = baseFilteredRows.value;
  const { months, years } = touchesPeriod.value;
  return {
    total: list.length,
    noTouches: list.filter((row) => !hasTouchesInPeriod(row, months, years)).length,
    noNextStep: list.filter((row) => !hasNextStep(row)).length,
  };
});

const filteredRows = computed(() => filterMonthlyReportRows(rows.value, {
  ...listFilterParams.value,
  onlyNoTouches: attentionFilter.value === 'no-touches',
  onlyNoNextStep: attentionFilter.value === 'no-next-step',
}));

const partnerTypeChips = computed(() =>
  recountChips(
    filterMonthlyReportRowsForChipCounts(rows.value, listFilterParams.value, 'partnerTypes'),
    partnerTypeChipDefs.value,
    'partnerTypeId',
  ),
);
const relationStatusChips = computed(() =>
  recountChips(
    filterMonthlyReportRowsForChipCounts(rows.value, listFilterParams.value, 'relationStatuses'),
    relationStatusChipDefs.value,
    'relationStatusId',
  ),
);
const currentStatusChips = computed(() =>
  recountChips(
    filterMonthlyReportRowsForChipCounts(rows.value, listFilterParams.value, 'currentStatuses'),
    currentStatusChipDefs.value,
    'currentStatusId',
  ),
);

const currentStatusOptions = computed(() =>
  currentStatusChipDefs.value.map((chip) => ({
    id: chip.id,
    title: chip.label,
  })),
);

const fieldEditorTitle = computed(() => 'Нозологии');

const fieldEditorPlaceholder = computed(() => fieldEditorTitle.value);

const fieldEditorOptions = computed(() => nosologyOptions.value);

const tableTitle = computed(() => {
  if (selectedPartnerTypes.value.length === 1 && selectedPartnerTypes.value[0] === 'new') {
    return 'Новые партнеры';
  }
  if (selectedPartnerTypes.value.length === 1 && selectedPartnerTypes.value[0] === 'active') {
    return 'Действующие партнеры';
  }
  return 'Партнеры';
});

function toggleChip(list: Ref<string[]>, id: string) {
  const index = list.value.indexOf(id);
  if (index >= 0) {
    list.value = list.value.filter((item) => item !== id);
    return;
  }
  list.value = [...list.value, id];
}

function isAllSelected(
  selected: Array<string | number>,
  options: Array<{ id: string | number }>,
): boolean {
  if (!options.length) {
    return false;
  }
  const selectedSet = new Set(selected.map(String));
  return options.every((option) => selectedSet.has(String(option.id)));
}

function toggleAllAssigned(checked: boolean | null) {
  selectedAssigned.value = checked
    ? props.assignedOptions.map((option) => option.id)
    : [];
}

function toggleAllMonths(checked: boolean | null) {
  selectedMonths.value = checked
    ? monthOptions.map((option) => option.id)
    : [];
}

function toggleAllYears(checked: boolean | null) {
  selectedYears.value = checked
    ? yearOptions.map((option) => String(option.id))
    : [];
}

function toggleAttentionFilter(filter: 'no-touches' | 'no-next-step') {
  attentionFilter.value = attentionFilter.value === filter ? 'all' : filter;
}

function onInsightClick(link: { path: string }) {
  openLink(link.path);
}

function startEditing(rowId: string, field: 'interest') {
  editingCell.value = { rowId, field };
}

function openFieldEditor(row: MonthlyReportRow, kind: FieldEditorKind) {
  fieldEditorRow.value = row;
  fieldEditorKind.value = kind;
  fieldEditorPartner.value = [row.partnerName, row.organization].filter(Boolean).join(', ');
  fieldEditorIds.value = [...(row.nosologyIds ?? [])];
  fieldEditorOpen.value = true;
}

async function onFieldEditorSave(value: string[] | string | null) {
  const row = fieldEditorRow.value;
  if (!row) {
    return;
  }

  await onNosologiesChange(row, Array.isArray(value) ? value : []);
  fieldEditorOpen.value = false;
}

async function onRelationStatusChange(row: MonthlyReportRow, statusId: string | null) {
  const nextId = statusId ? String(statusId) : '';
  const option = relationStatusOptions.value.find((item) => item.id === nextId);
  const prevId = row.relationStatusId;
  const prevLabel = row.relationStatus;
  const prevPartnerTypeId = row.partnerTypeId;
  const labelMap = new Map(relationStatusOptions.value.map((item) => [item.id, item.title]));

  row.relationStatusId = nextId;
  row.relationStatus = option?.title ?? '';
  row.partnerTypeId = resolvePartnerTypeId(nextId, labelMap);

  savingCell.value = true;
  try {
    await updateContactRelationStatus(row.id, nextId);
  } catch (error) {
    row.relationStatusId = prevId;
    row.relationStatus = prevLabel;
    row.partnerTypeId = prevPartnerTypeId;
    console.error('Не удалось сохранить статус отношений:', error);
    window.alert('Не удалось сохранить статус отношений');
  } finally {
    savingCell.value = false;
  }
}

async function onCurrentStatusChange(row: MonthlyReportRow, statusId: string | null) {
  const nextId = statusId ? String(statusId) : '';
  const option = currentStatusOptions.value.find((item) => item.id === nextId);
  const prevId = row.currentStatusId;
  const prevLabel = row.currentStatus;

  row.currentStatusId = nextId;
  row.currentStatus = option?.title ?? '';

  savingCell.value = true;
  try {
    await updateContactCurrentStatus(row.id, nextId);
  } catch (error) {
    row.currentStatusId = prevId;
    row.currentStatus = prevLabel;
    console.error('Не удалось сохранить текущий статус:', error);
    window.alert('Не удалось сохранить текущий статус');
  } finally {
    savingCell.value = false;
  }
}

async function onNosologiesChange(row: MonthlyReportRow, value: unknown) {
  const nextIds = Array.isArray(value)
    ? value.map((id) => String(id)).filter(Boolean)
    : [];
  const prevIds = [...(row.nosologyIds ?? [])];
  const prevLabel = row.nosologies;

  row.nosologyIds = nextIds;
  row.nosologies = nextIds
    .map((id) => nosologyOptions.value.find((option) => option.id === id)?.title ?? id)
    .join(', ');

  savingCell.value = true;
  try {
    await updateContactNosologies(row.id, nextIds);
  } catch (error) {
    row.nosologyIds = prevIds;
    row.nosologies = prevLabel;
    console.error('Не удалось сохранить нозологии:', error);
    window.alert('Не удалось сохранить нозологии');
  } finally {
    savingCell.value = false;
  }
}

async function onInterestBlur(row: MonthlyReportRow) {
  const nextValue = String(row.interest ?? '').trim();
  row.interest = nextValue;

  savingCell.value = true;
  try {
    await updateContactInterest(row.id, nextValue);
    editingCell.value = null;
  } catch (error) {
    console.error('Не удалось сохранить поле «Чем интересен»:', error);
    window.alert('Не удалось сохранить поле «Чем интересен»');
  } finally {
    savingCell.value = false;
  }
}

function openLink(path: string) {
  if (!path || path === '#') {
    return;
  }
  openBitrixPath(path);
}

function openInNewWindow(path: string) {
  if (!path || path === '#') {
    return;
  }
  openBitrixPathInNewWindow(path);
}

function openContact(contactId: string) {
  if (!contactId) {
    return;
  }
  openBitrixPathInNewWindow(buildContactDetailsPath(contactId));
}

function openReports(row: MonthlyReportRow) {
  if (!row.id) {
    return;
  }
  const label = [row.partnerName, row.organization].filter(Boolean).join(', ');
  openBitrixPathInNewWindow(buildMonthlyReportSpaListPath(row.id, label || undefined));
}

function touchCount(row: MonthlyReportRow, kind: TouchKind): number {
  return countTouchesByKind(
    row.touches ?? [],
    kind,
    touchesPeriod.value.months,
    touchesPeriod.value.years,
  );
}

function openTouchesDialog(row: MonthlyReportRow, kind: TouchKind) {
  touchesDialogPartner.value = [row.partnerName, row.organization].filter(Boolean).join(', ');
  touchesDialogItems.value = row.touches ?? [];
  touchesDialogKind.value = kind;
  touchesDialogOpen.value = true;
}

function openTouchItem(touch: MonthlyTouchItem) {
  openBitrixPath(buildTouchDetailsPath(touch.id));
}

function openTasksDialog(row: MonthlyReportRow) {
  tasksDialogPartner.value = [row.partnerName, row.organization].filter(Boolean).join(', ');
  tasksDialogItems.value = row.taskItems ?? [];
  tasksDialogOpen.value = true;
}

function openTaskItem(task: MonthlyTaskItem) {
  openBitrixPathInNewWindow(buildTaskDetailsPath(task.id));
}

async function submitRow(row: MonthlyReportRow) {
  if (sendingRowId.value) {
    return;
  }

  submitError.value = '';
  sendingRowId.value = row.id;

  try {
    // По умолчанию период = текущий месяц; касания в SPA только за этот период.
    const period = resolveReportPeriod(selectedMonths.value, selectedYears.value);
    const created = await createMonthlyReportSpaItem(row, period);
    openBitrixPath(buildMonthlyReportSpaDetailsPath(created.id));
  } catch (error) {
    console.error('Не удалось создать отчётность:', error);
    submitError.value = error instanceof Error ? error.message : 'Не удалось создать отчётность';
    window.alert(submitError.value);
  } finally {
    sendingRowId.value = null;
  }
}

async function refreshTableScroll() {
  await nextTick();
  refreshStickyReportTableHeaders();
}

watch(filteredRows, () => {
  void refreshTableScroll();
});

watch(isLoading, (loading) => {
  if (loading) {
    return;
  }
  mountStickyReportTableHeaders();
  void refreshTableScroll();
});

async function loadData() {
  isLoading.value = true;
  loadingProgress.value = 0;
  loadingMessage.value = 'Загрузка партнёров…';

  try {
    loadingProgress.value = 25;
    const data = await loadMonthlyReportData();
    loadingProgress.value = 90;
    rows.value = data.rows;
    partnerTypeChipDefs.value = data.partnerTypeChips;
    relationStatusChipDefs.value = data.relationStatusChips;
    relationStatusOptions.value = data.relationStatusOptions;
    currentStatusChipDefs.value = data.currentStatusChips;
    nosologyOptions.value = data.nosologyOptions;
    loadingProgress.value = 100;
    loadingMessage.value = 'Готово';
    window.setTimeout(() => {
      isLoading.value = false;
    }, 150);
  } catch (error) {
    console.error('Не удалось загрузить ежемесячную отчётность:', error);
    rows.value = [];
    loadingProgress.value = 100;
    isLoading.value = false;
  }
}

onMounted(() => {
  void runWhenBx24Ready(loadData);
});

onUnmounted(() => {
  unmountStickyReportTableHeaders();
});
</script>

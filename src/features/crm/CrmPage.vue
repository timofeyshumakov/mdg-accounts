<template>
  <v-app class="crm-app">
    <LoadingProgress
      :visible="isLoading"
      :model-value="loadingProgress"
      :message="loadingMessage"
      :auto-hide="false"
    />

    <v-main class="crm-page">
      <div class="crm-page__zoom" :style="zoomStyle">
        <CrmNav
          :items="navItems"
          :active-id="activeNavId"
          @navigate="onNavigate"
        />

        <template v-if="activeNavId === 'crm'">
          <CrmFiltersPanel
            v-model="filters"
            :assigned-options="assignedOptions"
            :partner-options="partnerOptions"
            :year-options="yearOptions"
          />
          <CrmSummaryCards :metrics="summaryMetrics" />
          <CrmChartsPanel :charts="charts" />
        </template>

        <MonthlyReportPage
          v-else-if="activeNavId === 'monthly-report'"
          :assigned-options="assignedOptions"
        />

        <section v-else class="crm-placeholder">
          <p>Раздел «{{ activeNavTitle }}» — в разработке</p>
        </section>
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import LoadingProgress from '../../components/LoadingProgress.vue';
import CrmNav from './components/CrmNav.vue';
import CrmSummaryCards from './components/CrmSummaryCards.vue';
import CrmChartsPanel from './components/CrmChartsPanel.vue';
import CrmFiltersPanel from './components/CrmFiltersPanel.vue';
import MonthlyReportPage from './components/MonthlyReportPage.vue';
import {
  navItems,
  summaryMetrics as defaultSummaryMetrics,
  charts as defaultCharts,
  type ChartBlock,
  type NavItem,
  type SummaryMetric,
} from './mock/dashboardData';
import { handleNavNavigation } from './functions/crmNavigation';
import {
  aggregateNosologyCounts,
  loadPartnerContactsNosologies,
  mapCountsToChartItems,
  type PartnerNosologyData,
} from './functions/nosologiesMetric';
import { buildPartnersPotentialChartItemsFromEvents } from './functions/partnersPotentialChart';
import {
  buildYearOptions,
  collectPartnerIdsFromEvents,
  contactPassesFilters,
  createEmptyFilters,
  eventPassesFilters,
  loadAssignedUsers,
  loadCompetitorEventsRaw,
  loadOurEventsRaw,
  loadPartnerOptions,
  type CrmDashboardFilters,
  type FilterOption,
} from './functions/crmFilters';
import { runWhenBx24Ready } from './functions/bitrixReady';
import { useAppZoom } from '../../composables/useAppZoom';

const { zoomStyle } = useAppZoom();
const activeNavId = ref('crm');
const summaryMetrics = ref<SummaryMetric[]>([...defaultSummaryMetrics]);
const charts = ref<ChartBlock[]>([...defaultCharts]);
const isLoading = ref(true);
const loadingProgress = ref(0);
const loadingMessage = ref('Инициализация…');

const filters = ref<CrmDashboardFilters>(createEmptyFilters());
const assignedOptions = ref<FilterOption[]>([]);
const partnerOptions = ref<FilterOption[]>([]);
const yearOptions = ref<FilterOption[]>(buildYearOptions());

const partnerNosologyData = ref<PartnerNosologyData | null>(null);
const ourEventsRaw = ref<Record<string, unknown>[]>([]);
const competitorEventsRaw = ref<Record<string, unknown>[]>([]);

const activeNavTitle = computed(
  () => navItems.find((item) => item.id === activeNavId.value)?.title ?? '',
);

function updateSummaryMetric(id: string, value: number) {
  summaryMetrics.value = summaryMetrics.value.map((metric) =>
    metric.id === id ? { ...metric, value } : metric,
  );
}

function updateChartItems(chartId: string, items: ChartBlock['items']) {
  charts.value = charts.value.map((chart) =>
    chart.id === chartId ? { ...chart, items } : chart,
  );
}

function setLoadingStep(progress: number, message: string) {
  loadingProgress.value = Math.max(loadingProgress.value, progress);
  loadingMessage.value = message;
}

function finishLoading() {
  loadingProgress.value = 100;
  loadingMessage.value = 'Готово';
  window.setTimeout(() => {
    isLoading.value = false;
  }, 150);
}

async function recomputeDashboard() {
  const currentFilters = filters.value;
  const dateFilteredOurEvents = ourEventsRaw.value.filter((event) =>
    eventPassesFilters(event, currentFilters),
  );
  const dateFilteredCompetitorEvents = competitorEventsRaw.value.filter((event) =>
    eventPassesFilters(event, currentFilters),
  );

  const partnerIdsFromEvents = (currentFilters.months.length || currentFilters.years.length)
    ? collectPartnerIdsFromEvents(dateFilteredOurEvents)
    : null;

  const nosology = partnerNosologyData.value;
  const filteredContacts = nosology
    ? nosology.contacts.filter((contact) =>
      contactPassesFilters(contact, currentFilters, partnerIdsFromEvents),
    )
    : [];

  updateSummaryMetric('partners', filteredContacts.length);
  updateSummaryMetric('our-events', dateFilteredOurEvents.length);
  updateSummaryMetric('competitor-events', dateFilteredCompetitorEvents.length);

  if (nosology) {
    const nosologyItems = mapCountsToChartItems(
      aggregateNosologyCounts(filteredContacts, nosology.fieldName, nosology.fieldMeta),
      nosology.labelMap,
    );
    updateSummaryMetric('nosologies', nosologyItems.length);
    updateChartItems('nosologies-partners', nosologyItems);
  }

  try {
    const potentialItems = await buildPartnersPotentialChartItemsFromEvents(dateFilteredOurEvents);
    updateChartItems('partners-potential', potentialItems);
  } catch (error) {
    console.warn('Не удалось пересчитать график коммерческого потенциала:', error);
  }
}

onMounted(() => {
  void runWhenBx24Ready(loadDashboardData);
});

watch(filters, () => {
  if (isLoading.value) {
    return;
  }
  void recomputeDashboard();
}, { deep: true });

async function loadDashboardData() {
  isLoading.value = true;
  loadingProgress.value = 0;
  loadingMessage.value = 'Подготовка данных…';

  try {
    setLoadingStep(8, 'Загрузка фильтров…');
    await Promise.all([
      loadAssignedUsers()
        .then((options) => { assignedOptions.value = options; })
        .catch((error) => {
          console.warn('Не удалось загрузить ответственных:', error);
        }),
      loadPartnerOptions()
        .then((options) => { partnerOptions.value = options; })
        .catch((error) => {
          console.warn('Не удалось загрузить партнеров для фильтра:', error);
        }),
    ]);

    setLoadingStep(28, 'Загрузка партнёров и нозологий…');
    await loadPartnerContactsNosologies()
      .then((data) => {
        partnerNosologyData.value = data;
      })
      .catch((error) => {
        console.warn('Не удалось загрузить данные по нозологиям:', error);
      });

    setLoadingStep(55, 'Загрузка мероприятий…');
    await loadOurEventsRaw()
      .then((events) => {
        ourEventsRaw.value = events;
      })
      .catch((error) => {
        console.warn('Не удалось загрузить мероприятия:', error);
      });

    setLoadingStep(75, 'Загрузка мероприятий конкурентов…');
    await loadCompetitorEventsRaw()
      .then((events) => {
        competitorEventsRaw.value = events;
      })
      .catch((error) => {
        console.warn('Не удалось загрузить мероприятия конкурентов:', error);
      });

    setLoadingStep(90, 'Расчёт показателей…');
    await recomputeDashboard();
    finishLoading();
  } catch (error) {
    console.error('Ошибка загрузки рабочего места:', error);
    finishLoading();
  }
}

function onNavigate(item: NavItem) {
  if (item.id === 'crm' || item.id === 'monthly-report') {
    activeNavId.value = item.id;
    return;
  }

  void handleNavNavigation(item).then((result) => {
    if (result === 'default') {
      activeNavId.value = item.id;
    }
  });
}
</script>

<style lang="sass">
#app
  margin: 0
  min-height: 100vh
  background: linear-gradient(180deg, #f4f8ff 0%, #f8fafc 100%)
  color: #0f172a

.crm-app
  background: transparent !important
</style>

<style lang="sass" src="./styles/crm-page.sass"></style>

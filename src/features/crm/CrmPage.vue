<template>
  <v-app class="crm-app">
    <v-main class="crm-page">
      <CrmNav
        :items="navItems"
        :active-id="activeNavId"
        @navigate="onNavigate"
      />

      <template v-if="activeNavId === 'crm'">
        <CrmSummaryCards :metrics="summaryMetrics" />
        <CrmChartsPanel :charts="charts" />
      </template>

      <section v-else class="crm-placeholder">
        <p>Раздел «{{ activeNavTitle }}» — в разработке</p>
      </section>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CrmNav from './components/CrmNav.vue';
import CrmSummaryCards from './components/CrmSummaryCards.vue';
import CrmChartsPanel from './components/CrmChartsPanel.vue';
import {
  navItems,
  summaryMetrics as defaultSummaryMetrics,
  charts as defaultCharts,
  type ChartBlock,
  type NavItem,
  type SummaryMetric,
} from './mock/dashboardData';
import { handleNavNavigation } from './functions/crmNavigation';
import { getPartnersCount } from './functions/partnersDirectory';
import {
  aggregateNosologyCounts,
  countFieldElements,
  loadPartnerContactsNosologies,
  mapCountsToChartItems,
} from './functions/nosologiesMetric';
import { getRecordFieldValue } from './functions/bitrixFields';
import { getOurEventsCount } from './functions/ourEventsMetric';
import { getCompetitorEventsCount } from './functions/competitorEventsMetric';
import { getPartnersPotentialChartItems } from './functions/partnersPotentialChart';
import { runWhenBx24Ready } from './functions/bitrixReady';

const activeNavId = ref('crm');
const summaryMetrics = ref<SummaryMetric[]>([...defaultSummaryMetrics]);
const charts = ref<ChartBlock[]>([...defaultCharts]);

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

onMounted(() => {
  void runWhenBx24Ready(loadDashboardData);
});

async function loadDashboardData() {
  await Promise.allSettled([
    getPartnersCount()
      .then((count) => updateSummaryMetric('partners', count))
      .catch((error) => {
        console.warn('Не удалось загрузить количество партнеров:', error);
      }),

    loadPartnerContactsNosologies()
      .then(({ contacts, fieldName, fieldMeta, labelMap }) => {
        const total = contacts.reduce(
          (sum, contact) => sum + countFieldElements(getRecordFieldValue(contact, fieldName, fieldMeta)),
          0,
        );
        updateSummaryMetric('nosologies', total);
        updateChartItems(
          'nosologies-partners',
          mapCountsToChartItems(aggregateNosologyCounts(contacts, fieldName, labelMap, fieldMeta)),
        );
      })
      .catch((error) => {
        console.warn('Не удалось загрузить данные по нозологиям:', error);
      }),

    getOurEventsCount()
      .then((count) => updateSummaryMetric('our-events', count))
      .catch((error) => {
        console.warn('Не удалось загрузить количество мероприятий:', error);
      }),

    getCompetitorEventsCount()
      .then((count) => updateSummaryMetric('competitor-events', count))
      .catch((error) => {
        console.warn('Не удалось загрузить количество мероприятий конкурентов:', error);
      }),

    getPartnersPotentialChartItems()
      .then((items) => updateChartItems('partners-potential', items))
      .catch((error) => {
        console.warn('Не удалось загрузить график коммерческого потенциала:', error);
      }),
  ]);
}

function onNavigate(item: NavItem) {
  if (item.id === 'crm') {
    activeNavId.value = 'crm';
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

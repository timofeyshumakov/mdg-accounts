<template>
  <section class="crm-charts">
    <CrmHorizontalChart
      v-for="chart in charts"
      :key="chart.id"
      :title="chart.title"
      :items="chart.items"
      :value-label="getChartValueLabel(chart.id)"
      :format-value="getChartFormatValue(chart.id)"
      :clickable="isChartClickable(chart.id)"
      @item-click="onChartItemClick(chart.id, $event)"
    />
  </section>
</template>

<script setup lang="ts">
import type { ChartBlock, ChartItem } from '../mock/dashboardData';
import { runWhenBx24Ready } from '../functions/bitrixReady';
import { NOSOLOGY_CONTACT_FIELD } from '../functions/nosologiesMetric';
import { openPartnersByNosology } from '../functions/partnersDirectory';
import { openPartnerEventsList } from '../functions/partnersPotentialChart';
import CrmHorizontalChart from './CrmHorizontalChart.vue';

defineProps<{
  charts: ChartBlock[];
}>();

function isChartClickable(chartId: string): boolean {
  return chartId === 'partners-potential' || chartId === 'nosologies-partners';
}

function getChartValueLabel(chartId: string): string {
  if (chartId === 'partners-potential') {
    return 'Объем, ₽';
  }

  if (chartId === 'nosologies-partners') {
    return 'Кол-во';
  }

  return 'Значение';
}

function getChartFormatValue(chartId: string): ((value: number) => string) | undefined {
  if (chartId === 'partners-potential') {
    return formatCurrency;
  }

  return formatCount;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value || 0);
}

function formatCount(value: number): string {
  return String(value || 0);
}

function onChartItemClick(chartId: string, item: ChartItem) {
  if (!item.id) {
    return;
  }

  if (chartId === 'partners-potential') {
    void runWhenBx24Ready(() => openPartnerEventsList(item.id!, item.label));
    return;
  }

  if (chartId === 'nosologies-partners') {
    void runWhenBx24Ready(() => openPartnersByNosology(
      item.id!,
      item.label,
      NOSOLOGY_CONTACT_FIELD,
    ));
  }
}
</script>

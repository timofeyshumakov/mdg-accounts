<template>
  <section class="crm-summary">
    <article
      v-for="metric in metrics"
      :key="metric.id"
      class="crm-summary__card"
    >
      <span class="crm-summary__label">{{ metric.label }}:</span>
      <strong class="crm-summary__value">{{ metric.value }}</strong>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { SummaryMetric } from '../mock/dashboardData';

defineProps<{
  metrics: SummaryMetric[];
}>();
</script>

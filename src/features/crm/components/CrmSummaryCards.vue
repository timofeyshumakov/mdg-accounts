<template>
  <section class="crm-summary">
    <article
      v-for="(metric, index) in metrics"
      :key="metric.id"
      class="crm-summary__card"
    >
      <span
        v-if="iconById[metric.id]"
        class="crm-summary__icon-wrap"
        :style="{ backgroundColor: iconColors[index] ?? iconColors[0] }"
      >
        <img
          class="crm-summary__icon"
          :src="iconById[metric.id]"
          :alt="metric.label"
        >
      </span>
      <div class="crm-summary__content">
        <span class="crm-summary__label">{{ metric.label }}</span>
        <strong class="crm-summary__value">{{ metric.value }}</strong>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { SummaryMetric } from '../mock/dashboardData';

defineProps<{
  metrics: SummaryMetric[];
}>();

const iconColors = ['#f3f4f8', '#f6f7e7', '#eff7ec', '#fbf0ea'] as const;

const iconById: Record<string, string> = {
  partners: '/assets/icons/partners.png',
  nosologies: '/assets/icons/nosologies.png',
  'our-events': '/assets/icons/our-events.png',
  'competitor-events': '/assets/icons/competitor-events.png',
};
</script>

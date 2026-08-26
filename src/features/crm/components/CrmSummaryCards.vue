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
      <span class="crm-summary__label">{{ metric.label }}:</span>
      <strong class="crm-summary__value">{{ metric.value }}</strong>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { SummaryMetric } from '../mock/dashboardData';
import partnersIcon from '../assets/icons/partners.png';
import nosologiesIcon from '../assets/icons/nosologies.png';
import ourEventsIcon from '../assets/icons/our-events.png';
import competitorEventsIcon from '../assets/icons/competitor-events.png';

defineProps<{
  metrics: SummaryMetric[];
}>();

const iconColors = ['#f3f4f8', '#f6f7e7', '#eff7ec', '#fbf0ea'] as const;

const iconById: Record<string, string> = {
  partners: partnersIcon,
  nosologies: nosologiesIcon,
  'our-events': ourEventsIcon,
  'competitor-events': competitorEventsIcon,
};
</script>

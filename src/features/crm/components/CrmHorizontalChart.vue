<template>
  <article class="dashboard-card dashboard-card--rating">
    <div class="panel-header">
      <h3>{{ title }}</h3>
      <span>{{ valueLabel }}</span>
    </div>

    <v-data-table
      v-if="ratedItems.length"
      :headers="ratingHeaders"
      :items="ratedItems"
      :item-value="rowKey"
      density="compact"
      :items-per-page="10"
      hide-default-header
      class="rating-table"
    >
      <template #item.rank="{ item }">
        <div class="rank" :class="`rank--${item.rank}`">{{ item.rank }}</div>
      </template>

      <template #item.label="{ item }">
        <div class="label-cell">
          <button
            v-if="clickable && item.id"
            type="button"
            class="item-name item-name--clickable"
            :title="item.label"
            @click="emit('item-click', item)"
          >
            {{ item.label }}
          </button>
          <span v-else class="item-name" :title="item.label">{{ item.label }}</span>
        </div>
      </template>

      <template #item.progress="{ item }">
        <div class="progress-cell">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${item.percent}%` }" />
          </div>
        </div>
      </template>

      <template #item.value="{ item }">
        <span class="amount">{{ formatDisplayValue(item.value) }}</span>
      </template>
    </v-data-table>

    <div v-else class="empty-state">Нет данных для отображения</div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChartItem } from '../mock/dashboardData';

interface RatedChartItem extends ChartItem {
  rank: number;
  percent: number;
}

const props = withDefaults(defineProps<{
  title: string;
  items: ChartItem[];
  clickable?: boolean;
  valueLabel?: string;
  formatValue?: (value: number) => string;
}>(), {
  valueLabel: 'Значение',
  formatValue: undefined,
});

const emit = defineEmits<{
  'item-click': [item: ChartItem];
}>();

const ratingHeaders = [
  { title: '', key: 'rank', sortable: false, width: '2.5rem' },
  { title: '', key: 'label', sortable: false },
  { title: '', key: 'progress', sortable: false, width: '30%' },
  { title: '', key: 'value', align: 'end', sortable: false, width: '7.5rem' },
];

const maxValue = computed(() =>
  Math.max(...props.items.map((item) => item.value), 0),
);

const ratedItems = computed<RatedChartItem[]>(() =>
  props.items.map((item, index) => ({
    ...item,
    rank: index + 1,
    percent: maxValue.value > 0
      ? Math.round((item.value / maxValue.value) * 100)
      : 0,
  })),
);

function rowKey(item: RatedChartItem): string {
  return item.id ?? item.label;
}

function formatDisplayValue(value: number): string {
  if (props.formatValue) {
    return props.formatValue(value);
  }

  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value || 0);
}
</script>

<style lang="sass" scoped>
.dashboard-card
  min-height: 300px
  padding: 1.15rem
  position: relative
  width: 100%
  border: 1px solid rgba(148, 163, 184, 0.16)
  border-radius: 18px
  background: rgba(255, 255, 255, 0.94)
  box-shadow: 0 14px 35px rgba(15, 23, 42, 0.07)

  h3
    margin: 0
    font-size: 1rem
    font-weight: 800

.dashboard-card--rating
  min-height: 0
  display: flex
  flex-direction: column

  .rating-table
    flex: 1 1 auto

.panel-header
  display: flex
  align-items: flex-start
  justify-content: space-between
  gap: 1rem
  margin-bottom: 1.25rem

.panel-header h3
  margin: 0
  color: #1f2937
  font-size: 1rem
  font-weight: 800
  line-height: 1.35

.panel-header span
  color: #8b94a6
  font-size: 0.78rem
  font-weight: 700
  text-transform: uppercase
  white-space: nowrap

.rating-table
  --rating-rank-width: 2.5rem
  --rating-amount-width: clamp(5.5rem, 11vw, 7.5rem)
  --rating-progress-width: 30%
  --rating-label-gap: clamp(0.25rem, 1.2vw, 0.85rem)
  --rating-progress-gap: clamp(0.2rem, 0.8vw, 0.65rem)
  background: transparent

  :deep(.v-table)
    background: transparent

  :deep(table)
    table-layout: fixed
    width: 100%

  :deep(.v-data-table-footer)
    justify-content: center
    border-top: 1px solid #eef0f4

  :deep(.v-data-table-footer__items-per-page)
    margin-inline-end: 1rem

  :deep(tbody tr)
    transition: background-color 0.18s ease

  :deep(tbody tr:hover)
    background: #fbfcff

  :deep(td)
    border-color: #eef0f4 !important
    height: 38px
    vertical-align: middle

  :deep(td:nth-child(1))
    width: var(--rating-rank-width)
    max-width: var(--rating-rank-width)
    padding-inline: 0.35rem

  :deep(td:nth-child(2))
    width: auto
    min-width: 0
    max-width: none
    overflow: hidden
    padding-right: var(--rating-label-gap)

  :deep(td:nth-child(3))
    width: var(--rating-progress-width)
    min-width: var(--rating-progress-width)
    padding-left: var(--rating-progress-gap)
    padding-right: var(--rating-progress-gap)
    text-align: center
    vertical-align: middle

  :deep(td:nth-child(4))
    width: var(--rating-amount-width)
    max-width: var(--rating-amount-width)
    padding-left: 0.35rem

.rank
  color: #1f2937
  font-weight: 800
  text-align: center

.rank--1,
.rank--2,
.rank--3
  width: 1.6rem
  height: 1.6rem
  border-radius: 999px
  color: white
  line-height: 1.6rem

.rank--1
  background: #f2b23f

.rank--2
  background: #8aa2c7

.rank--3
  background: #c58b56

.label-cell
  display: block
  width: 100%
  min-width: 0
  max-width: 100%
  overflow: hidden

.item-name
  display: block
  width: 100%
  min-width: 0
  overflow: hidden
  color: #1f2937
  font-weight: 700
  text-decoration: none
  text-overflow: ellipsis
  white-space: nowrap

.item-name--clickable
  padding: 0
  border: 0
  background: transparent
  font: inherit
  text-align: left
  cursor: pointer

  &:hover
    color: #1d6fe8

.progress-cell
  display: flex
  align-items: center
  justify-content: center
  width: 100%
  min-height: 38px

.progress-track
  width: 100%
  max-width: 100%
  height: 7px
  overflow: hidden
  border-radius: 999px
  background: #eef1f5

.progress-fill
  height: 100%
  border-radius: inherit
  background: linear-gradient(90deg, #1d6fe8, #5aa1ff)

.amount
  white-space: nowrap
  color: #169b5c
  font-family: monospace
  font-weight: 800
  text-align: right

.empty-state
  display: flex
  min-height: 180px
  align-items: center
  justify-content: center
  color: #8b94a6
  text-align: center

@media (max-width: 760px)
  .rating-table
    --rating-amount-width: clamp(4.75rem, 16vw, 6.5rem)
</style>

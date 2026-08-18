<template>
  <v-data-table
    :headers="dynamicHeaders"
    :items="processedItems"
    :items-per-page="10"
    class="elevation-1"
    :loading="isLoading"
  >
    <!-- Динамические ячейки для годов -->
    <template v-for="header in allHeaders" :key="header.key" v-slot:[`item.${header.key}`]="{ item }">
      <template v-if="/^\d{4}$/.test(header.key) || header.key === 'summ'">
        {{ formatNumber(item[header.key]) }}
      </template>
      <template v-else>
        {{ item[header.key] }}
      </template>
    </template>

    <!-- Футер с итогами -->
    <template v-slot:body.append>
      <TableFooterTotal
        v-if="items.length > 0"
        :headers="allHeaders"
        :total-row="totalRow"
        :format-number="formatNumber"
      />
    </template>
  </v-data-table>
</template>

<script setup>
import { computed } from 'vue'
import TableFooterTotal from './TableFooterTotal.vue'
import { useStatusesTable } from '../../composables/useStatusesTable'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  statuses: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:processed-items', 'update:total-row'])

// Используем композабл для логики таблицы статусов
const { processedItems, totalRow, dynamicHeaders, allHeaders } = useStatusesTable(
  computed(() => props.items),
  computed(() => props.statuses),
  emit
)

const formatNumber = (num) => {
  if (num > 0) {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(num)
  }
  return '0 ₽'
}
</script>
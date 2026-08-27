<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="touches-dialog">
      <v-card-title class="touches-dialog__title">
        Касания
        <span v-if="partnerName" class="touches-dialog__partner">{{ partnerName }}</span>
        <span class="touches-dialog__count">{{ filteredTouches.length }}</span>
      </v-card-title>

      <v-card-text class="touches-dialog__body">
        <v-text-field
          v-model="search"
          placeholder="Поиск по касаниям"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="$magnify"
          class="touches-dialog__search"
        />

        <div class="touches-dialog__list">
          <button
            v-for="touch in filteredTouches"
            :key="touch.id"
            type="button"
            class="touches-dialog__item"
            @click="emit('open-touch', touch)"
          >
            <span class="touches-dialog__type">{{ touch.typeLabel || 'Касание' }}</span>
            <span class="touches-dialog__name">{{ touch.title }}</span>
            <span class="touches-dialog__date">{{ formatTouchDate(touch.createdTime) }}</span>
          </button>

          <p v-if="!filteredTouches.length" class="touches-dialog__empty">
            Касания не найдены
          </p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          Закрыть
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { MonthlyTouchItem, TouchKind } from '../mock/monthlyReportData';
import { filterTouches } from '../functions/monthlyTouches';

const props = defineProps<{
  modelValue: boolean;
  partnerName?: string;
  touches: MonthlyTouchItem[];
  kind?: TouchKind | null;
  months?: number[];
  years?: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'open-touch': [touch: MonthlyTouchItem];
}>();

const search = ref('');

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      search.value = '';
    }
  },
);

const filteredTouches = computed(() => filterTouches(props.touches, {
  kind: props.kind,
  months: props.months ?? [],
  years: props.years ?? [],
  search: search.value,
}));

function formatTouchDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    return value;
  }
  return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`;
}
</script>

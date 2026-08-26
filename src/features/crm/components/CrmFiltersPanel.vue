<template>
  <section class="crm-filters panel">
    <div class="crm-filters__grid">
      <div class="crm-filters__item">
        <span class="crm-filters__label">Ответственный</span>
        <v-autocomplete
          :model-value="modelValue.assignedIds"
          :items="assignedOptions"
          item-title="title"
          item-value="id"
          placeholder="Все ответственные"
          density="compact"
          single-line
          hide-details
          variant="outlined"
          multiple
          chips
          clearable
          prepend-inner-icon="$accountOutline"
          @update:model-value="patch({ assignedIds: asStringArray($event) })"
        >
          <template #prepend-item>
            <v-list-item>
              <v-checkbox
                :model-value="isAllSelected(modelValue.assignedIds, assignedOptions)"
                label="Выбрать всех ответственных"
                hide-details
                density="compact"
                :disabled="!assignedOptions.length"
                @update:model-value="toggleAll('assignedIds', assignedOptions, $event)"
              />
            </v-list-item>
          </template>
        </v-autocomplete>
      </div>

      <div class="crm-filters__item">
        <span class="crm-filters__label">Партнер</span>
        <v-autocomplete
          :model-value="modelValue.partnerIds"
          :items="partnerOptions"
          item-title="title"
          item-value="id"
          placeholder="Все партнеры"
          density="compact"
          single-line
          hide-details
          variant="outlined"
          multiple
          chips
          clearable
          prepend-inner-icon="$handshakeOutline"
          @update:model-value="patch({ partnerIds: asStringArray($event) })"
        >
          <template #prepend-item>
            <v-list-item>
              <v-checkbox
                :model-value="isAllSelected(modelValue.partnerIds, partnerOptions)"
                label="Выбрать всех партнеров"
                hide-details
                density="compact"
                :disabled="!partnerOptions.length"
                @update:model-value="toggleAll('partnerIds', partnerOptions, $event)"
              />
            </v-list-item>
          </template>
        </v-autocomplete>
      </div>

      <div class="crm-filters__item">
        <span class="crm-filters__label">Месяц</span>
        <v-autocomplete
          :model-value="modelValue.months"
          :items="monthOptions"
          item-title="title"
          item-value="id"
          placeholder="Все месяцы"
          density="compact"
          single-line
          hide-details
          variant="outlined"
          multiple
          chips
          clearable
          prepend-inner-icon="$calendarMonthOutline"
          @update:model-value="patch({ months: asNumberArray($event) })"
        >
          <template #prepend-item>
            <v-list-item>
              <v-checkbox
                :model-value="isAllSelected(modelValue.months, monthOptions)"
                label="Выбрать все месяцы"
                hide-details
                density="compact"
                @update:model-value="toggleAllMonths($event)"
              />
            </v-list-item>
          </template>
        </v-autocomplete>
      </div>

      <div class="crm-filters__item">
        <span class="crm-filters__label">Год</span>
        <v-autocomplete
          :model-value="modelValue.years"
          :items="yearOptions"
          item-title="title"
          item-value="id"
          placeholder="Все годы"
          density="compact"
          single-line
          hide-details
          variant="outlined"
          multiple
          chips
          clearable
          prepend-inner-icon="$calendarOutline"
          @update:model-value="patch({ years: asStringArray($event) })"
        >
          <template #prepend-item>
            <v-list-item>
              <v-checkbox
                :model-value="isAllYearsSelected"
                label="Выбрать все годы"
                hide-details
                density="compact"
                @update:model-value="toggleAllYears($event)"
              />
            </v-list-item>
          </template>
        </v-autocomplete>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  MONTH_OPTIONS,
  type CrmDashboardFilters,
  type FilterOption,
  type MonthOption,
} from '../functions/crmFilters';

const props = defineProps<{
  modelValue: CrmDashboardFilters;
  assignedOptions: FilterOption[];
  partnerOptions: FilterOption[];
  yearOptions: FilterOption[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CrmDashboardFilters];
}>();

const monthOptions = MONTH_OPTIONS;

const isAllYearsSelected = computed(() =>
  isAllSelected(props.modelValue.years, props.yearOptions),
);

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isFinite(item))
    : [];
}

function patch(partial: Partial<CrmDashboardFilters>) {
  emit('update:modelValue', {
    ...props.modelValue,
    ...partial,
  });
}

function isAllSelected(
  selected: Array<string | number>,
  options: Array<FilterOption | MonthOption>,
): boolean {
  if (!options.length) {
    return false;
  }

  const selectedSet = new Set(selected.map(String));
  return options.every((option) => selectedSet.has(String(option.id)));
}

function toggleAll(
  key: 'assignedIds' | 'partnerIds',
  options: FilterOption[],
  checked: boolean | null,
) {
  patch({
    [key]: checked ? options.map((option) => option.id) : [],
  });
}

function toggleAllMonths(checked: boolean | null) {
  patch({
    months: checked ? MONTH_OPTIONS.map((option) => option.id) : [],
  });
}

function toggleAllYears(checked: boolean | null) {
  patch({
    years: checked ? props.yearOptions.map((option) => option.id) : [],
  });
}
</script>

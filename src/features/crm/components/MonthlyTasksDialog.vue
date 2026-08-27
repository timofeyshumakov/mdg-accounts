<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="touches-dialog">
      <v-card-title class="touches-dialog__title">
        Задачи
        <span v-if="partnerName" class="touches-dialog__partner">{{ partnerName }}</span>
        <span class="touches-dialog__count">{{ filteredTasks.length }}</span>
      </v-card-title>

      <v-card-text class="touches-dialog__body">
        <v-text-field
          v-model="search"
          placeholder="Поиск по задачам"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="$magnify"
          class="touches-dialog__search"
        />

        <div class="touches-dialog__list">
          <button
            v-for="task in filteredTasks"
            :key="task.id"
            type="button"
            class="touches-dialog__item touches-dialog__item--tasks"
            @click="emit('open-task', task)"
          >
            <span class="touches-dialog__name touches-dialog__name--full">{{ task.title }}</span>
            <span class="touches-dialog__date">#{{ task.id }}</span>
          </button>

          <p v-if="!filteredTasks.length" class="touches-dialog__empty">
            Задачи не найдены
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
import type { MonthlyTaskItem } from '../functions/monthlyTasks';

const props = defineProps<{
  modelValue: boolean;
  partnerName?: string;
  tasks: MonthlyTaskItem[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'open-task': [task: MonthlyTaskItem];
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

const filteredTasks = computed(() => {
  const needle = search.value.trim().toLowerCase();
  if (!needle) {
    return props.tasks;
  }
  return props.tasks.filter((task) =>
    `${task.title} ${task.id}`.toLowerCase().includes(needle),
  );
});
</script>

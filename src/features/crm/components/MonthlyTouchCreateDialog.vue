<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="touch-create-dialog">
      <v-card-title class="touch-create-dialog__title">
        Создать касание
        <span v-if="partnerName" class="touch-create-dialog__partner">{{ partnerName }}</span>
      </v-card-title>

      <v-card-text class="touch-create-dialog__body">
        <label class="touch-create-dialog__field">
          <span class="touch-create-dialog__label">Партнер (клиент) <em>*</em></span>
          <v-text-field
            :model-value="partnerName"
            density="compact"
            variant="outlined"
            hide-details
            readonly
          />
        </label>

        <label class="touch-create-dialog__field">
          <span class="touch-create-dialog__label">Вид <em>*</em></span>
          <v-select
            v-model="typeId"
            :items="typeOptions"
            item-title="title"
            item-value="id"
            density="compact"
            variant="outlined"
            hide-details
            :loading="loadingTypes"
            :disabled="loadingTypes || !typeOptions.length"
            placeholder="Выберите вид"
          />
        </label>

        <label class="touch-create-dialog__field">
          <span class="touch-create-dialog__label">Дата <em>*</em></span>
          <v-text-field
            v-model="date"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
          />
        </label>

        <label class="touch-create-dialog__field">
          <span class="touch-create-dialog__label">Комментарий <em>*</em></span>
          <v-textarea
            v-model="comment"
            density="compact"
            variant="outlined"
            hide-details
            rows="3"
            auto-grow
            placeholder="Комментарий к касанию"
          />
        </label>

        <p v-if="error" class="touch-create-dialog__error">{{ error }}</p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="emit('update:modelValue', false)">
          Отмена
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!canSubmit"
          @click="submit"
        >
          Создать
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { TouchKind } from '../mock/monthlyReportData';
import {
  createTouchItem,
  formatTouchDateInput,
  loadTouchTypeOptions,
  resolveDefaultTouchTypeId,
  type TouchTypeOption,
} from '../functions/monthlyTouches';

const props = defineProps<{
  modelValue: boolean;
  contactId: string;
  partnerName?: string;
  defaultKind?: TouchKind | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  created: [];
}>();

const typeOptions = ref<TouchTypeOption[]>([]);
const typeId = ref('');
const date = ref(formatTouchDateInput());
const comment = ref('');
const loadingTypes = ref(false);
const localSaving = ref(false);
const error = ref('');

const saving = computed(() => props.saving || localSaving.value);

const canSubmit = computed(() =>
  Boolean(
    props.contactId
    && props.partnerName?.trim()
    && typeId.value
    && date.value
    && comment.value.trim(),
  ) && !saving.value,
);

async function ensureTypeOptions() {
  if (typeOptions.value.length) {
    typeId.value = resolveDefaultTouchTypeId(typeOptions.value, props.defaultKind);
    return;
  }

  loadingTypes.value = true;
  error.value = '';
  try {
    typeOptions.value = await loadTouchTypeOptions();
    typeId.value = resolveDefaultTouchTypeId(typeOptions.value, props.defaultKind);
    if (!typeOptions.value.length) {
      error.value = 'Не удалось загрузить виды касаний';
    }
  } catch (err) {
    console.error(err);
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить виды касаний';
  } finally {
    loadingTypes.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return;
    }
    comment.value = '';
    date.value = formatTouchDateInput();
    error.value = '';
    void ensureTypeOptions();
  },
);

watch(
  () => props.defaultKind,
  () => {
    if (props.modelValue && typeOptions.value.length) {
      typeId.value = resolveDefaultTouchTypeId(typeOptions.value, props.defaultKind);
    }
  },
);

async function submit() {
  if (!canSubmit.value) {
    return;
  }

  localSaving.value = true;
  error.value = '';
  try {
    await createTouchItem({
      contactId: props.contactId,
      typeId: typeId.value,
      comment: comment.value,
      date: date.value,
      partnerName: props.partnerName,
    });
    emit('created');
    emit('update:modelValue', false);
  } catch (err) {
    console.error(err);
    error.value = err instanceof Error ? err.message : 'Не удалось создать касание';
  } finally {
    localSaving.value = false;
  }
}
</script>

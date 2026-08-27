<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="monthly-field-dialog">
      <v-card-title class="monthly-field-dialog__title">
        {{ title }}
        <span v-if="partnerName" class="monthly-field-dialog__partner">{{ partnerName }}</span>
      </v-card-title>

      <v-card-text>
        <button
          v-if="!editing"
          type="button"
          class="monthly-field-dialog__text"
          :class="{ 'monthly-field-dialog__text--empty': !displayText }"
          @click="editing = true"
        >
          {{ displayText || placeholder || '—' }}
        </button>

        <template v-else>
          <v-autocomplete
            v-if="multiple"
            v-model="draftMultiple"
            :items="options"
            item-title="title"
            item-value="id"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            multiple
            chips
            closable-chips
            autofocus
            :placeholder="placeholder"
            :menu-props="{ maxHeight: 280 }"
          />
          <v-autocomplete
            v-else
            v-model="draftSingle"
            :items="options"
            item-title="title"
            item-value="id"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            autofocus
            :placeholder="placeholder"
            :menu-props="{ maxHeight: 280 }"
          />
        </template>
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
          :disabled="!editing"
          @click="emitSave"
        >
          Сохранить
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  title: string;
  partnerName?: string;
  placeholder?: string;
  options: Array<{ id: string; title: string }>;
  multiple?: boolean;
  modelIds?: string[];
  modelId?: string | null;
  startEditing?: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [value: string[] | string | null];
}>();

const editing = ref(false);
const draftMultiple = ref<string[]>([]);
const draftSingle = ref<string | null>(null);

const displayText = computed(() => {
  if (props.multiple) {
    const ids = editing.value ? draftMultiple.value : (props.modelIds ?? []);
    return ids
      .map((id) => props.options.find((option) => option.id === id)?.title ?? id)
      .filter(Boolean)
      .join(', ');
  }

  const id = editing.value ? draftSingle.value : props.modelId;
  if (!id) {
    return '';
  }
  return props.options.find((option) => option.id === id)?.title ?? String(id);
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      editing.value = false;
      return;
    }
    editing.value = Boolean(props.startEditing);
    if (props.multiple) {
      draftMultiple.value = [...(props.modelIds ?? [])];
    } else {
      draftSingle.value = props.modelId || null;
    }
  },
);

function emitSave() {
  if (props.multiple) {
    emit('save', [...draftMultiple.value]);
    return;
  }
  emit('save', draftSingle.value);
}
</script>

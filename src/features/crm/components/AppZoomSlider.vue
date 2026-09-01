<template>
  <div class="app-zoom" aria-label="Масштаб приложения">
    <span class="app-zoom__label">Масштаб</span>
    <v-slider
      v-model="zoom"
      class="app-zoom__slider"
      :min="minZoom"
      :max="maxZoom"
      :step="step"
      hide-details
      color="primary"
      track-color="#dbe3ee"
      thumb-label
    >
      <template #thumb-label="{ modelValue }">
        {{ modelValue }}%
      </template>
    </v-slider>
    <span class="app-zoom__value">{{ zoom }}%</span>
  </div>
</template>

<script setup lang="ts">
import { useAppZoom } from '../../../composables/useAppZoom';

const { zoom, minZoom, maxZoom, step } = useAppZoom();
</script>

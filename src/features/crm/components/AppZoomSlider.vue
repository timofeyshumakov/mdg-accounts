<template>
  <div class="app-zoom" aria-label="Масштаб приложения">
    <button
      type="button"
      class="app-zoom__btn"
      aria-label="Уменьшить масштаб"
      title="Уменьшить на 10%"
      :disabled="zoom <= minZoom"
      @click="zoomOut"
    >
      −
    </button>
    <span class="app-zoom__value">{{ zoom }}%</span>
    <button
      type="button"
      class="app-zoom__btn"
      aria-label="Увеличить масштаб"
      title="Увеличить на 10%"
      :disabled="zoom >= maxZoom"
      @click="zoomIn"
    >
      +
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAppZoom } from '../../../composables/useAppZoom';

const { zoom, minZoom, maxZoom, zoomIn, zoomOut } = useAppZoom();
</script>

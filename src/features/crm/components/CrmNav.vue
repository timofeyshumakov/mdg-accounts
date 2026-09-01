<template>
  <section class="crm-nav-panel panel">
    <nav class="workspace-tabs" role="tablist" aria-label="Разделы цифрового рабочего места">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        role="tab"
        class="workspace-tabs__item"
        :class="{
          'workspace-tabs__item--active': item.id === activeId,
          'workspace-tabs__item--brand': item.isBrand,
        }"
        :aria-selected="item.id === activeId"
        @click="onNavClick(item)"
      >
        {{ item.title }}
      </button>
    </nav>
    <AppZoomSlider />
  </section>
</template>

<script setup lang="ts">
import AppZoomSlider from './AppZoomSlider.vue';
import type { NavItem } from '../mock/dashboardData';

defineProps<{
  items: NavItem[];
  activeId: string;
}>();

const emit = defineEmits<{
  navigate: [item: NavItem];
}>();

function onNavClick(item: NavItem) {
  emit('navigate', item);
}
</script>

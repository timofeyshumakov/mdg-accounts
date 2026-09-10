<template>
  <nav class="workspace-tabs" aria-label="Разделы цифрового рабочего места">
    <div
      v-for="group in groups"
      :key="group.id"
      class="workspace-tabs__item"
      :class="{ 'workspace-tabs__item--open': openGroupId === group.id }"
    >
      <button
        type="button"
        class="workspace-tabs__tab"
        :class="{
          'workspace-tabs__tab--active': isGroupActive(group),
          'workspace-tabs__tab--brand': group.isBrand,
        }"
        :aria-expanded="hasChildren(group) ? openGroupId === group.id : undefined"
        :aria-haspopup="hasChildren(group) ? 'menu' : undefined"
        @click="onGroupClick(group)"
      >
        <span>{{ group.title }}</span>
        <span v-if="hasChildren(group)" class="workspace-tabs__chevron" aria-hidden="true">▾</span>
      </button>

      <div
        v-if="hasChildren(group) && openGroupId === group.id"
        class="workspace-tabs__menu"
        role="menu"
      >
        <button
          v-for="child in group.children"
          :key="child.id"
          type="button"
          role="menuitem"
          class="workspace-tabs__menu-item"
          :class="{ 'workspace-tabs__menu-item--active': child.id === activeId }"
          @click="onChildClick(child)"
        >
          {{ child.title }}
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { NavGroup, NavItem } from '../mock/dashboardData';

const props = defineProps<{
  groups: NavGroup[];
  activeId: string;
}>();

const emit = defineEmits<{
  navigate: [item: NavItem];
}>();

const openGroupId = ref<string | null>(null);

function hasChildren(group: NavGroup): boolean {
  return Boolean(group.children?.length);
}

function isGroupActive(group: NavGroup): boolean {
  if (group.item && group.item.id === props.activeId) {
    return true;
  }
  return Boolean(group.children?.some((child) => child.id === props.activeId));
}

function closeMenus() {
  openGroupId.value = null;
}

function onGroupClick(group: NavGroup) {
  if (hasChildren(group)) {
    openGroupId.value = openGroupId.value === group.id ? null : group.id;
    return;
  }
  closeMenus();
  if (group.item) {
    emit('navigate', group.item);
  }
}

function onChildClick(item: NavItem) {
  closeMenus();
  emit('navigate', item);
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (!target.closest('.workspace-tabs__item')) {
    closeMenus();
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
});
</script>

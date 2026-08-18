<template>
  <div class="filters">
    <FilterAutocomplete
      v-model="filters.selected.regularEvents"
      :items="filterOptions.regularEvents"
      label="Мероприятие"
      @update:model-value="updateSelectAll('regularEvents')"
    >
      <FilterSelectAll
        v-model="filters.selectAll.regularEvents"
        label="Выбрать все мероприятия"
        @change="() => toggleSelectAll('regularEvents')"
      />
    </FilterAutocomplete>

    <FilterAutocomplete
      v-model="filters.selected.companies"
      :items="filterOptions.companies"
      label="Компания"
      @update:model-value="updateSelectAll('companies')"
    >
      <FilterSelectAll
        v-model="filters.selectAll.companies"
        label="Выбрать все компании"
        @change="() => toggleSelectAll('companies')"
      />
    </FilterAutocomplete>

    <FilterAutocomplete
      v-model="filters.selected.statuses"
      :items="filterOptions.statuses"
      label="Статус участия"
      @update:model-value="updateSelectAll('statuses')"
    >
      <FilterSelectAll
        v-model="filters.selectAll.statuses"
        label="Выбрать все статусы"
        @change="() => toggleSelectAll('statuses')"
      />
    </FilterAutocomplete>

    <FilterAutocomplete
      v-model="filters.selected.years"
      :items="filterOptions.years"
      label="Год"
      @update:model-value="updateSelectAll('years')"
    >
      <FilterSelectAll
        v-model="filters.selectAll.years"
        label="Выбрать все годы"
        @change="() => toggleSelectAll('years')"
      />
    </FilterAutocomplete>
  </div>
</template>

<script setup>
import FilterAutocomplete from './FilterAutocomplete.vue'
import FilterSelectAll from './FilterSelectAll.vue'

const props = defineProps({
  filters: Object,
  filterOptions: Object
})

const emit = defineEmits(['toggle-select-all'])

const toggleSelectAll = (type) => emit('toggle-select-all', type)

const updateSelectAll = (type) => {
  // Логика обновления состояния selectAll
}
</script>

<style lang="sass" scoped>
.filters
  display: grid
  grid-template-columns: 1fr 1fr
  gap: 1rem
</style>
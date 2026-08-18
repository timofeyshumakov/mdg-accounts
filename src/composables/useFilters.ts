// composables/useFilters.js
import { ref, reactive, computed, watch } from 'vue'
import { callApi } from '../functions/callApi'
import moment from 'moment'

export function useFilters() {
  // Состояние фильтров
  const filters = reactive({
    value: {
      companies: [],
      events: [],
      years: [],
      statuses: [],
      regularEvents: [],
    },
    selected: {
      companies: [],
      events: [],
      years: [],
      statuses: [],
      regularEvents: [],
    },
    selectAll: {
      companies: false,
      events: false,
      years: false,
      statuses: false,
      regularEvents: false,
    }
  })

  // Опции фильтров (вычисляемые)
  const filterOptions = computed(() => filters.value)
  
  // Состояние загрузки фильтров
  const isLoadingFilters = ref(false)
  const filtersError = ref(null)

  // Вспомогательные функции
  const fields = ref([])
  const cities = ref([])

  // Инициализация фильтров
  const initFilters = async () => {
    isLoadingFilters.value = true
    filtersError.value = null
    
    try {
      await Promise.all([
        loadFields(),
        loadYears(),
        loadCompanies(),
        loadEvents(),
        loadStatuses(),
        loadRegularEvents(),
        loadCities()
      ])
      
      // Инициализируем watchers после загрузки данных
      initWatchers()
      
    } catch (error) {
      console.error('Ошибка при загрузке фильтров:', error)
      filtersError.value = 'Не удалось загрузить фильтры'
      throw error
    } finally {
      isLoadingFilters.value = false
    }
  }

  // Загрузка полей сделок
  const loadFields = async () => {
    fields.value = await callApi(
      "crm.deal.fields", 
      {}, 
      ["OPPORTUNITY", "UF_CRM_1744096783472"], 
      null, 
      null, 
      null
    )
    return fields.value
  }

  // Загрузка годов
  const loadYears = async () => {
    return new Promise((resolve) => {
      BX24.callMethod("crm.deal.list", {
        order: { "UF_CRM_1744096783472": "ASC" },
        select: ["UF_CRM_1744096783472"],
        filter: { "!UF_CRM_1744096783472": "null" },
      }, (res) => {
        if (res.data()) {
          const years = []
          const currentYear = moment().year()
          const startYear = res.data().length > 0 
            ? moment(res.data()[0].UF_CRM_1744096783472).format('YYYY') 
            : moment().year()
          
          for (let year = startYear; year <= currentYear; year++) {
            years.push(+year)
          }
          
          filters.value.years = years
          resolve(years)
        } else {
          filters.value.years = []
          resolve([])
        }
      })
    })
  }

  // Загрузка компаний
  const loadCompanies = async () => {
    const companies = await callApi(
      "crm.company.list", 
      {}, 
      [], 
      null, 
      null, 
      null
    ) || []
    
    filters.value.companies = companies.map(company => ({
      ID: company.ID,
      TITLE: company.TITLE
    }))
    
    return filters.value.companies
  }

  // Загрузка мероприятий
  const loadEvents = async () => {
    const events = await callApi(
      "crm.item.list", 
      {}, 
      ["id", "title", "ufCrm38_1750326807", "ufCrm38_1753082280"], 
      1052, 
      null, 
      null
    ) || []
    
    filters.value.events = events.map(item => ({
      ID: item.id,
      TITLE: item.title,
      CITY: item.ufCrm38_1753082280,
      ufCrm38_1750326807: item.ufCrm38_1750326807
    }))
    
    return filters.value.events
  }

  // Загрузка статусов участия
  const loadStatuses = async () => {
    const statuses = await callApi(
      "crm.item.list", 
      {}, 
      ["id", "title"], 
      1080, 
      null, 
      null
    ) || []
    
    filters.value.statuses = statuses.map(item => ({
      ID: item.id,
      TITLE: item.title
    }))
    
    return filters.value.statuses
  }

  // Загрузка регулярных мероприятий
  const loadRegularEvents = async () => {
    const regularEvents = await callApi(
      "crm.item.list", 
      {}, 
      ["id", "title", "ufCrm54_1754646027539"], 
      1084, 
      null, 
      null
    ) || []
    
    filters.value.regularEvents = regularEvents.map(item => ({
      ID: item.id,
      TITLE: item.title,
      ufCrm54_1754646027539: item.ufCrm54_1754646027539
    }))
    
    return filters.value.regularEvents
  }

  // Загрузка городов
  const loadCities = async () => {
    const citiesData = await callApi(
      "crm.item.list", 
      {}, 
      ["id", "title"], 
      1094, 
      null, 
      null
    ) || []
    
    cities.value = citiesData.map(item => ({
      ID: item.id,
      TITLE: item.title
    }))
    
    return cities.value
  }

  // Переключение "Выбрать все"
  const toggleSelectAll = (type) => {
    try {
      if (filters.selectAll[type]) {
        filters.selected[type] = Array.isArray(filters.value[type]) 
          ? (typeof filters.value[type][0] === 'object' 
              ? filters.value[type].map(item => item.ID)
              : filters.value[type])
          : []
      } else {
        filters.selected[type] = []
      }
    } catch (error) {
      console.error(`Ошибка при выборе всех ${type}:`, error)
      filtersError.value = error.message
      throw error
    }
  }

  // Сброс всех фильтров
  const resetFilters = () => {
    Object.keys(filters.selectAll).forEach(key => {
      filters.selectAll[key] = false
      filters.selected[key] = []
    })
  }

  // Отключение фильтров (аналог disableFilters)
  const disableFilters = () => {
    resetFilters()
  }

  // Получить активные фильтры для запроса
  const getActiveFilters = () => {
    return {
      events: filters.selected.events.length === 0 
        ? filters.value.events.map(item => item.ID)
        : filters.selected.events,
      statuses: filters.selected.statuses.length === 0 
        ? filters.value.statuses.map(item => item.ID)
        : filters.selected.statuses,
      companies: filters.selected.companies.length === 0 
        ? filters.value.companies.map(item => item.ID)
        : filters.selected.companies,
      years: filters.selected.years,
      regularEvents: filters.selected.regularEvents
    }
  }

  // Поиск названия по ID
  const findNameById = (id, type, defaultField = 'TITLE') => {
    if (!id || id === "0") return null
    
    const items = filters.value[type] || []
    const found = items.find(item => +item.ID === +id)
    
    if (found) {
      return found[defaultField] || found.VALUE || null
    }
    
    return null
  }

  // Инициализация watchers
  const initWatchers = () => {
    // Watcher для событий
    watch(
      () => filters.selected.events,
      (newVal) => {
        filters.selectAll.events = newVal.length === (filters.value.events || []).length
      },
      { deep: true }
    )

    // Watcher для компаний
    watch(
      () => filters.selected.companies,
      (newVal) => {
        filters.selectAll.companies = newVal.length === (filters.value.companies || []).length
      },
      { deep: true }
    )

    // Watcher для статусов
    watch(
      () => filters.selected.statuses,
      (newVal) => {
        filters.selectAll.statuses = newVal.length === (filters.value.statuses || []).length
      },
      { deep: true }
    )

    // Watcher для годов
    watch(
      () => filters.selected.years,
      (newVal) => {
        filters.selectAll.years = newVal.length === (filters.value.years || []).length
      },
      { deep: true }
    )

    // Watcher для регулярных мероприятий
    watch(
      () => filters.selected.regularEvents,
      (newVal) => {
        filters.selectAll.regularEvents = newVal.length === (filters.value.regularEvents || []).length
      },
      { deep: true }
    )
  }

  return {
    // Состояние
    filters,
    filterOptions,
    cities: computed(() => cities.value),
    isLoadingFilters,
    filtersError,
    
    // Методы
    initFilters,
    toggleSelectAll,
    resetFilters,
    disableFilters,
    getActiveFilters,
    findNameById,
    
    // Данные
    fields: computed(() => fields.value)
  }
}
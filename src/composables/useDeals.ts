// composables/useDeals.js
import { ref, computed } from 'vue'
import { callApi } from '../functions/callApi'
import moment from 'moment'

export function useDeals() {
  const deals = ref([])
  const isLoadingDeals = ref(false)
  const dealsError = ref(null)

  // Получение всех сделок с пагинацией
  const fetchAllDeals = async (filterParams = {}) => {
    let allDeals = []
    let start = 0
    const batchSize = 50
    let hasMore = true

    while (hasMore) {
      try {
        const response = await fetch("https://b24market.webtm.ru/test/handler.php", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: "crm.deal.list",
            filters: {
              "@UF_CRM_1742797326": filterParams.events || [],
              "@UF_CRM_1745995594": filterParams.statuses || [],
              "COMPANY_ID": filterParams.companies || [],
              ">UF_CRM_1744096783472": "01.01.2000",
              ...filterParams.custom
            },
            select: [
              "UF_CRM_1744096783472", 
              "ID",
              "UF_CRM_1742797326", 
              "UF_CRM_1745995594", 
              "COMPANY_ID", 
              "OPPORTUNITY"
            ],
            start,
            limit: batchSize
          })
        })

        const data = await response.json()
        
        if (data.data && data.data.length > 0) {
          allDeals = allDeals.concat(data.data)
          start += batchSize
          hasMore = data.data.length >= batchSize
        } else {
          hasMore = false
        }
      } catch (error) {
        console.error('Ошибка при получении сделок:', error)
        dealsError.value = error.message
        hasMore = false
        throw error
      }
    }

    return allDeals
  }

  // Получение сделок через callApi (альтернативный метод)
  const fetchDealsViaCallApi = async (filterParams = {}) => {
    return await callApi(
      "crm.deal.list",
      {
        ">UF_CRM_1744096783472": "01.01.2000",
        "@UF_CRM_1742797326": filterParams.events || [],
        "@UF_CRM_1745995594": filterParams.statuses || [],
        "COMPANY_ID": filterParams.companies || []
      },
      ["UF_CRM_1744096783472", "ID", "UF_CRM_1742797326", "UF_CRM_1745995594", "COMPANY_ID", "OPPORTUNITY"],
      null,
      null,
      null
    ) || []
  }

  // Основной метод получения сделок
  const fetchDeals = async (filters) => {
    isLoadingDeals.value = true
    dealsError.value = null
    
    try {
      const activeFilters = filters.getActiveFilters ? filters.getActiveFilters() : filters
      const dealsData = await fetchAllDeals(activeFilters)
      deals.value = dealsData
      return dealsData
    } catch (error) {
      dealsError.value = error.message
      throw error
    } finally {
      isLoadingDeals.value = false
    }
  }

  // Фильтрация сделок по regularEvents
  const filterByRegularEvents = (dealsData, regularEvents, eventsData) => {
    if (!regularEvents || regularEvents.length === 0) {
      return dealsData
    }

    return dealsData.filter(deal => {
      const event = eventsData?.find(e => e.ID === +deal.UF_CRM_1742797326)
      return event && regularEvents.includes(+event.ufCrm38_1750326807)
    })
  }

  // Обогащение сделок дополнительными данными
  const enrichDeals = (dealsData, companies, events, statuses, cities) => {
    return dealsData.map(deal => {
      const event = events?.find(e => e.ID === +deal.UF_CRM_1742797326)
      const year = moment(deal.UF_CRM_1744096783472).format('YYYY')
      const statusId = Array.isArray(deal.UF_CRM_1745995594) 
        ? deal.UF_CRM_1745995594[0] 
        : deal.UF_CRM_1745995594

      return {
        ...deal,
        EVENT: findEventName(deal.UF_CRM_1742797326, events),
        COMPANY_ID: findEventName(deal.COMPANY_ID, companies),
        [year]: (+deal.OPPORTUNITY).toFixed(0),
        [`${year}_status`]: findEventName(statusId, statuses),
        regularEvent: event?.ufCrm38_1750326807,
        CITY: cities?.find(city => city.ID === +event?.CITY)?.TITLE
      }
    })
  }

  // Вспомогательная функция для поиска названия
  const findEventName = (id, items) => {
    if (!id || id === "0" || !items) return null
    
    const idNum = +id
    const found = items.find(item => +item.ID === idNum)
    
    if (found?.VALUE) return found.VALUE
    if (found?.TITLE) return found.TITLE
    
    return null
  }

  // Получение уникальных годов из сделок
  const getUniqueYears = (dealsData) => {
    return dealsData
      .map(deal => moment(deal.UF_CRM_1744096783472).format('YYYY'))
      .filter((year, index, self) => self.indexOf(year) === index)
      .sort()
  }

  // Группировка сделок по годам
  const groupByYears = (dealsData) => {
    const result = []
    const grouped = {}

    dealsData.forEach(deal => {
      const key = `${deal.COMPANY_ID}_${deal.EVENT}`
      if (!grouped[key]) {
        grouped[key] = {
          COMPANY_ID: deal.COMPANY_ID,
          EVENT: deal.EVENT,
          regularEvent: deal.regularEvent,
          CITY: deal.CITY
        }
      }

      const year = moment(deal.UF_CRM_1744096783472).format('YYYY')
      grouped[key][year] = (+deal.OPPORTUNITY).toFixed(0)
      grouped[key][`${year}_status`] = deal[`${year}_status`]
    })

    return Object.values(grouped)
  }

  return {
    // Состояние
    deals,
    isLoadingDeals,
    dealsError,
    
    // Методы
    fetchDeals,
    fetchAllDeals,
    fetchDealsViaCallApi,
    filterByRegularEvents,
    enrichDeals,
    getUniqueYears,
    groupByYears,
    findEventName
  }
}
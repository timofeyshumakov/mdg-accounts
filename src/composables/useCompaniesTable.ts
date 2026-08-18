// composables/useCompaniesTable.js
import { ref, computed, watch } from 'vue'
import { callApi } from '../functions/callApi'

export function useCompaniesTable() {
  const items = ref([])
  const headers = ref([])
  const totalRow = ref({ total: 0 })
  const isLoadingTable = ref(false)
  const tableError = ref(null)

  // Базовые заголовки
  const baseHeaders = [
    { title: 'Мероприятие', key: 'EVENT', width: '25%' },
    { title: 'Компания', key: 'COMPANY_ID' }
  ]

  // Все заголовки (с учетом вложенных)
  const allHeaders = computed(() => {
    const result = []
    headers.value.forEach(header => {
      if (header.children) {
        result.push(...header.children)
      } else {
        result.push(header)
      }
    })
    return result
  })

  // Формирование заголовков с годами
  const generateYearHeaders = (uniqueYears) => {
    return uniqueYears.map(year => ({
      title: year,
      key: year,
      align: 'center',
      children: [
        { title: 'Статус участия', key: `${year}_status` },
        { title: 'Сумма', key: year }
      ]
    }))
  }

  // Обработка данных для таблицы
  const processCompaniesData = async (dealsData, filterOptions) => {
    isLoadingTable.value = true
    tableError.value = null
    
    try {
      // Получаем уникальные компании
      const uniqueCompanyIds = [...new Set(dealsData.map(item => item.COMPANY_ID))]
      
      // Загружаем данные компаний
      const companies = await callApi(
        "crm.company.list",
        { "ID": uniqueCompanyIds },
        [],
        null,
        null,
        null
      ) || []

      // Обогащаем сделки названиями компаний
      const enrichedDeals = dealsData.map(deal => ({
        ...deal,
        COMPANY_NAME: findCompanyName(deal.COMPANY_ID, companies)
      }))

      // Получаем уникальные годы
      const uniqueYears = [...new Set(
        dealsData
          .map(item => item.UF_CRM_1744096783472)
          .filter(Boolean)
          .map(date => new Date(date).getFullYear().toString())
      )].sort()

      // Группируем данные по компаниям и мероприятиям
      const groupedData = groupDataByCompanyAndEvent(enrichedDeals, uniqueYears)
      
      // Вычисляем итоговые суммы
      const totals = calculateTotals(groupedData, uniqueYears)
      
      // Обновляем заголовки
      headers.value = [
        ...baseHeaders,
        ...generateYearHeaders(uniqueYears),
        { title: 'Сумма', key: 'total', width: '25%' }
      ]

      // Обрабатываем массивы в свойствах
      const processedData = joinArrayProps(groupedData)
      
      items.value = processedData
      totalRow.value = totals

      return {
        items: processedData,
        headers: headers.value,
        totalRow: totals
      }
    } catch (error) {
      console.error('Ошибка при обработке данных таблицы:', error)
      tableError.value = error.message
      throw error
    } finally {
      isLoadingTable.value = false
    }
  }

  // Поиск названия компании
  const findCompanyName = (companyId, companies) => {
    const company = companies.find(c => c.ID === companyId)
    return company?.TITLE || companyId
  }

  // Группировка данных
  const groupDataByCompanyAndEvent = (deals, years) => {
    const groupedMap = new Map()

    deals.forEach(deal => {
      const key = `${deal.COMPANY_ID}_${deal.UF_CRM_1742797326}`
      
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          COMPANY_ID: deal.COMPANY_NAME || deal.COMPANY_ID,
          EVENT: deal.EVENT,
          regularEvent: deal.regularEvent,
          CITY: deal.CITY,
          total: 0
        })
      }

      const entry = groupedMap.get(key)
      const year = new Date(deal.UF_CRM_1744096783472).getFullYear().toString()
      
      // Добавляем сумму за год
      const amount = parseFloat(deal.OPPORTUNITY) || 0
      entry[year] = (parseFloat(entry[year]) || 0) + amount
      entry[`${year}_status`] = deal[`${year}_status`]
      entry.total += amount
    })

    return Array.from(groupedMap.values())
  }

  // Вычисление итоговых сумм
  const calculateTotals = (data, years) => {
    const totals = {
      total: 0
    }

    data.forEach(item => {
      totals.total += item.total || 0
      
      years.forEach(year => {
        if (item[year]) {
          totals[year] = (totals[year] || 0) + (parseFloat(item[year]) || 0)
        }
      })
    })

    // Форматируем итоги
    Object.keys(totals).forEach(key => {
      if (key !== 'total' || totals[key] > 0) {
        totals[key] = formatNumber(totals[key])
      }
    })
    
    totals.total = formatNumber(totals.total)

    return totals
  }

  // Объединение массивов в строки
  const joinArrayProps = (arr) => {
    return arr.map(obj => {
      const newObj = { ...obj }
      Object.keys(newObj).forEach(key => {
        if (Array.isArray(newObj[key])) {
          newObj[key] = newObj[key]
            .map(v => v === null ? '' : String(v))
            .join(', ')
        }
      })
      return newObj
    })
  }

  // Форматирование чисел
  const formatNumber = (num) => {
    try {
      if (num > 0) {
        return new Intl.NumberFormat("ru-RU", { 
          style: "currency", 
          currency: "RUB",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(num)
      }
      return '0 ₽'
    } catch (error) {
      console.error('Ошибка форматирования числа:', error)
      return String(num || 0)
    }
  }

  // Обновление данных таблицы
  const updateTableData = (newData) => {
    items.value = newData
  }

  // Сброс таблицы
  const resetTable = () => {
    items.value = []
    headers.value = [...baseHeaders]
    totalRow.value = { total: 0 }
  }

  return {
    // Состояние
    items,
    headers,
    totalRow,
    allHeaders,
    isLoadingTable,
    tableError,
    
    // Методы
    processCompaniesData,
    updateTableData,
    resetTable,
    formatNumber
  }
}
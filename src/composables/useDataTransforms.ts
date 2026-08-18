// composables/useDataTransforms.js
import { useUtils } from './useUtils'

export function useDataTransforms() {
  const { getYear, safeParseInt, safeParseFloat, getFirstValue } = useUtils()

  // Трансформация сделки для отображения
  const transformDeal = (deal, options = {}) => {
    const {
      events = [],
      companies = [],
      statuses = [],
      cities = []
    } = options

    const year = getYear(deal.UF_CRM_1744096783472)
    const statusId = getFirstValue(deal.UF_CRM_1745995594)
    const eventId = deal.UF_CRM_1742797326
    const companyId = deal.COMPANY_ID

    const event = events.find(e => +e.ID === +eventId)
    const status = statuses.find(s => +s.ID === +statusId)
    const cityId = event?.CITY
    const city = cities.find(c => +c.ID === +cityId)

    return {
      ...deal,
      EVENT: event?.TITLE || event?.VALUE || null,
      COMPANY_ID: findItemTitle(companyId, companies),
      [year]: safeParseFloat(deal.OPPORTUNITY).toFixed(0),
      [`${year}_status`]: status?.TITLE || null,
      regularEvent: event?.ufCrm38_1750326807,
      CITY: city?.TITLE || null
    }
  }

  // Трансформация массива сделок
  const transformDeals = (deals, options = {}) => {
    return deals.map(deal => transformDeal(deal, options))
  }

  // Мердж данных по компаниям и мероприятиям
  const mergeByCompanyAndEvent = (deals) => {
    const merged = new Map()

    deals.forEach(deal => {
      const key = `${deal.COMPANY_ID}_${deal.UF_CRM_1742797326}`
      
      if (!merged.has(key)) {
        merged.set(key, {
          COMPANY_ID: deal.COMPANY_ID,
          EVENT: deal.EVENT,
          regularEvent: deal.regularEvent,
          CITY: deal.CITY,
          total: 0
        })
      }

      const entry = merged.get(key)
      const year = getYear(deal.UF_CRM_1744096783472)
      const amount = safeParseFloat(deal.OPPORTUNITY)
      
      entry[year] = (safeParseFloat(entry[year]) + amount).toFixed(0)
      entry[`${year}_status`] = deal[`${year}_status`]
      entry.total += amount
    })

    return Array.from(merged.values())
  }

  // Группировка по статусам
  const groupByStatus = (deals, statuses = []) => {
    const grouped = new Map()

    deals.forEach(deal => {
      const statusId = getFirstValue(deal.UF_CRM_1745995594)
      if (!statusId) return

      if (!grouped.has(statusId)) {
        const statusName = findItemTitle(statusId, statuses)
        grouped.set(statusId, {
          status: statusName || statusId,
          originalId: statusId
        })
      }

      const entry = grouped.get(statusId)
      const year = getYear(deal.UF_CRM_1744096783472)
      const amount = safeParseFloat(deal.OPPORTUNITY)

      entry[year] = (entry[year] || 0) + amount
      entry[`${year}_amount`] = (entry[`${year}_amount`] || 0) + 1
    })

    return Array.from(grouped.values())
  }

  // Добавление итоговых сумм
  const addTotals = (items, years) => {
    return items.map(item => {
      let total = 0
      
      years.forEach(year => {
        if (item[year]) {
          total += item[year]
        }
        item[`${year}_summ`] = item[year] || 0
        item[year] = item[year] || 0
      })
      
      item.summ = total
      return item
    })
  }

  // Вычисление итоговой строки
  const calculateTotalRow = (items, years) => {
    const totals = {
      total: 0
    }

    items.forEach(item => {
      totals.total += item.total || 0
      
      years.forEach(year => {
        if (item[year]) {
          totals[year] = (totals[year] || 0) + safeParseFloat(item[year])
        }
      })
    })

    return totals
  }

  // Поиск названия элемента по ID
  const findItemTitle = (id, items, field = 'TITLE') => {
    if (!id || !items) return null
    
    const idNum = +id
    const found = items.find(item => +item.ID === idNum)
    
    if (found) {
      return found[field] || found.VALUE || null
    }
    
    return null
  }

  // Получение уникальных годов из сделок
  const extractUniqueYears = (deals) => {
    return deals
      .map(deal => getYear(deal.UF_CRM_1744096783472))
      .filter((year, index, self) => year && self.indexOf(year) === index)
      .sort()
  }

  return {
    transformDeal,
    transformDeals,
    mergeByCompanyAndEvent,
    groupByStatus,
    addTotals,
    calculateTotalRow,
    findItemTitle,
    extractUniqueYears
  }
}
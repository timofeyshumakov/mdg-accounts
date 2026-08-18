import { ref, computed, watch } from 'vue'

export function useStatusesTable(items, statuses, emit) {
  const processedItems = ref([])
  const totalRow = ref({})
  
  // Вычисляем уникальные годы из данных
  const uniqueYears = computed(() => {
    if (!items.value.length) return []
    return items.value
      .map(item => item.UF_CRM_1744096783472 ? 
        new Date(item.UF_CRM_1744096783472).getFullYear().toString() : null)
      .filter((year, index, self) => year && self.indexOf(year) === index)
      .sort()
  })

  // Динамические заголовки для таблицы
  const dynamicHeaders = computed(() => {
    return [
      { title: 'Статус участия', key: 'UF_CRM_1745995594' },
      { title: 'Сумма', key: 'OPPORTUNITY' }
    ]
  })

  const allHeaders = computed(() => {
    const result = []
    dynamicHeaders.value.forEach(header => {
      if (header.children) {
        result.push(...header.children)
      } else {
        result.push(header)
      }
    })
    return result
  })

  // Основная функция обработки данных
  const processStatusesData = () => {
    console.log(items);
    if (!items.value.length) {
      processedItems.value = []
      totalRow.value = {}
      return
    }

    const statusesMap = new Map()
    
    // Группируем по статусам
    items.value.forEach(item => {
      const statusId = item.UF_CRM_1745995594?.[0]
      if (!statusId) return
      
      if (!statusesMap.has(statusId)) {
        statusesMap.set(statusId, { status: statusId })
      }
      
      const statusData = statusesMap.get(statusId)
      const year = new Date(item.UF_CRM_1744096783472).getFullYear().toString()
      const amount = parseInt(item.OPPORTUNITY) || 0
      
      statusData[year] = (statusData[year] || 0) + amount
      statusData[`${year}_amount`] = (statusData[`${year}_amount`] || 0) + 1
    })

    // Преобразуем Map в массив и заменяем ID статусов на названия
    const statusesArray = Array.from(statusesMap.values()).map(item => {
      const statusName = statuses.value.find(s => s.ID === item.status)?.TITLE || item.status
      
      // Вычисляем сумму по всем годам
      let total = 0
      uniqueYears.value.forEach(year => {
        if (item[year]) total += item[year]
      })
      
      return {
        ...item,
        status: statusName,
        summ: total
      }
    })

    // Вычисляем итоговую строку
    const totals = statusesArray.reduce((acc, item) => {
      uniqueYears.value.forEach(year => {
        acc[year] = (acc[year] || 0) + (item[year] || 0)
        acc[`${year}_amount`] = (acc[`${year}_amount`] || 0) + (item[`${year}_amount`] || 0)
      })
      acc.summ = (acc.summ || 0) + (item.summ || 0)
      return acc
    }, { status: 'Итого:' })

    processedItems.value = statusesArray
    totalRow.value = totals
    
    emit('update:processed-items', statusesArray)
    emit('update:total-row', totals)
  }

  // Следим за изменениями данных
  watch(items, processStatusesData, { deep: true, immediate: true })
  watch(statuses, processStatusesData, { deep: true })

  return {
    processedItems,
    totalRow,
    dynamicHeaders,
    allHeaders,
    uniqueYears
  }
}
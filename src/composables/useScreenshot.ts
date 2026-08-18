// composables/useScreenshot.js
import { ref } from 'vue'
import html2canvas from 'html2canvas'

export function useScreenshot() {
  const screenshotSrc = ref(null)
  const isTakingScreenshot = ref(false)
  const screenshotError = ref(null)

  // Элементы для скрытия при создании скриншота
  const defaultElementsToHide = [
    '.v-expansion-panels',
    '.buttons',
    '.takeScreenshot',
    '.v-dialog',
    '.loading'
  ]

  // Состояние видимости элементов
  const elementsVisibility = new Map()

  // Скрыть элементы перед скриншотом
  const hideElements = (selectors = defaultElementsToHide) => {
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector)
        elements.forEach(el => {
          if (el) {
            // Сохраняем текущее состояние
            elementsVisibility.set(el, {
              display: el.style.display,
              visibility: el.style.visibility,
              opacity: el.style.opacity
            })
            // Скрываем элемент
            el.style.display = 'none'
          }
        })
      } catch (error) {
        console.warn(`Ошибка при скрытии элементов ${selector}:`, error)
      }
    })
  }

  // Восстановить видимость элементов
  const restoreElements = () => {
    elementsVisibility.forEach((styles, el) => {
      try {
        el.style.display = styles.display || ''
        el.style.visibility = styles.visibility || ''
        el.style.opacity = styles.opacity || ''
      } catch (error) {
        console.warn('Ошибка при восстановлении элемента:', error)
      }
    })
    elementsVisibility.clear()
  }

  // Создание скриншота
  const takeScreenshot = async (options = {}) => {
    isTakingScreenshot.value = true
    screenshotError.value = null
    
    const {
      element = document.body,
      hideSelectors = defaultElementsToHide,
      fileName = `screenshot-${Date.now()}.png`,
      quality = 1,
      scale = 2, // Увеличиваем качество
      backgroundColor = '#ffffff'
    } = options

    try {
      // Скрываем элементы
      hideElements(hideSelectors)
      
      // Небольшая задержка для применения стилей
      await new Promise(resolve => setTimeout(resolve, 100))

      // Создаем скриншот
      const canvas = await html2canvas(element, {
        scale,
        backgroundColor,
        allowTaint: true,
        useCORS: true,
        logging: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Дополнительные манипуляции с клоном документа
          const clonedElements = clonedDoc.querySelectorAll(hideSelectors.join(','))
          clonedElements.forEach(el => {
            el.style.display = 'none'
          })
        }
      })

      // Получаем изображение в base64
      const imageSrc = canvas.toDataURL('image/png', quality)
      screenshotSrc.value = imageSrc

      return {
        src: imageSrc,
        canvas,
        fileName
      }
    } catch (error) {
      console.error('Ошибка при создании скриншота:', error)
      screenshotError.value = error.message || 'Ошибка при создании скриншота'
      throw error
    } finally {
      // Восстанавливаем элементы
      restoreElements()
      isTakingScreenshot.value = false
    }
  }

  // Создание скриншота конкретного элемента
  const takeElementScreenshot = async (elementSelector, options = {}) => {
    const element = typeof elementSelector === 'string'
      ? document.querySelector(elementSelector)
      : elementSelector
    
    if (!element) {
      throw new Error('Элемент не найден')
    }

    return takeScreenshot({
      element,
      hideSelectors: [],
      ...options
    })
  }

  // Скачивание скриншота
  const downloadScreenshot = (src = screenshotSrc.value, fileName = 'screenshot.png') => {
    if (!src) {
      throw new Error('Нет скриншота для скачивания')
    }

    const link = document.createElement('a')
    link.download = fileName
    link.href = src
    link.click()
  }

  // Очистка скриншота
  const clearScreenshot = () => {
    screenshotSrc.value = null
  }

  // Перед скриншотом (для использования в компонентах)
  const beforeScreenshot = (hideSelectors = defaultElementsToHide) => {
    hideElements(hideSelectors)
  }

  // После скриншота
  const afterScreenshot = () => {
    restoreElements()
  }

  return {
    // Состояние
    screenshotSrc,
    isTakingScreenshot,
    screenshotError,
    
    // Методы
    takeScreenshot,
    takeElementScreenshot,
    downloadScreenshot,
    clearScreenshot,
    beforeScreenshot,
    afterScreenshot,
    hideElements,
    restoreElements
  }
}
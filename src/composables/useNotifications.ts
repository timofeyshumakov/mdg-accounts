// composables/useNotifications.js
import { ref } from 'vue'

export function useNotifications() {
  const successDialog = ref(false)
  const errorDialog = ref(false)
  const infoDialog = ref(false)
  const confirmDialog = ref(false)
  
  const successMessage = ref('')
  const errorMessage = ref('')
  const infoMessage = ref('')
  const confirmMessage = ref('')
  
  const confirmCallback = ref(null)

  // Показать успешное уведомление
  const showSuccess = (message = 'Успешно выполнено!') => {
    successMessage.value = message
    successDialog.value = true
  }

  // Показать ошибку
  const showError = (message = 'Произошла ошибка!') => {
    errorMessage.value = message
    errorDialog.value = true
  }

  // Показать информационное сообщение
  const showInfo = (message) => {
    infoMessage.value = message
    infoDialog.value = true
  }

  // Показать диалог подтверждения
  const showConfirm = (message, callback) => {
    confirmMessage.value = message
    confirmCallback.value = callback
    confirmDialog.value = true
  }

  // Подтверждение действия
  const confirmAction = () => {
    if (confirmCallback.value) {
      confirmCallback.value()
    }
    confirmDialog.value = false
    confirmCallback.value = null
  }

  // Отмена подтверждения
  const cancelConfirm = () => {
    confirmDialog.value = false
    confirmCallback.value = null
  }

  // Сброс всех уведомлений
  const resetNotifications = () => {
    successDialog.value = false
    errorDialog.value = false
    infoDialog.value = false
    confirmDialog.value = false
    
    successMessage.value = ''
    errorMessage.value = ''
    infoMessage.value = ''
    confirmMessage.value = ''
    
    confirmCallback.value = null
  }

  return {
    // Состояние диалогов
    successDialog,
    errorDialog,
    infoDialog,
    confirmDialog,
    
    // Сообщения
    successMessage,
    errorMessage,
    infoMessage,
    confirmMessage,
    
    // Методы
    showSuccess,
    showError,
    showInfo,
    showConfirm,
    confirmAction,
    cancelConfirm,
    resetNotifications
  }
}
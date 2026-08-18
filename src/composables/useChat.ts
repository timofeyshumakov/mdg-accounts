// composables/useChat.js
import { ref, computed } from 'vue'
import { callApi } from '../functions/callApi'

export function useChat() {
  const chats = ref([])
  const selectedChatId = ref(null)
  const dialog = ref(false)
  const searchQuery = ref('')
  const isLoadingChats = ref(false)
  const chatError = ref(null)
  const uploadResult = ref(null)

  // Фильтрация чатов по поисковому запросу
  const filteredChats = computed(() => {
    if (!searchQuery.value) return chats.value
    
    const query = searchQuery.value.toLowerCase()
    return chats.value.filter(chat => 
      chat.title?.toLowerCase().includes(query) ||
      chat.message?.text?.toLowerCase().includes(query)
    )
  })

  // Загрузка списка чатов
  const loadChats = async (forceReload = false) => {
    if (chats.value.length > 0 && !forceReload) {
      return chats.value
    }

    isLoadingChats.value = true
    chatError.value = null

    try {
      const result = await callApi(
        'im.recent.list',
        { 'SKIP_OPENLINES': 'Y' },
        [],
        null,
        null,
        null
      )

      // Обрабатываем результат
      const processedChats = processChatsData(result)
      chats.value = processedChats
      
      return processedChats
    } catch (error) {
      console.error('Ошибка при загрузке чатов:', error)
      chatError.value = error.message || 'Ошибка загрузки чатов'
      throw error
    } finally {
      isLoadingChats.value = false
    }
  }

  // Обработка данных чатов
  const processChatsData = (data) => {
    if (!data) return []

    // Преобразуем объект в массив, если необходимо
    const chatsArray = Array.isArray(data) ? data : Object.values(data)

    return chatsArray
      .filter(chat => chat.chat_id || chat.id)
      .map(chat => ({
        chat_id: chat.chat_id || chat.id,
        title: chat.title || chat.name || 'Без названия',
        message: chat.message || {},
        type: chat.type,
        avatar: chat.avatar,
        counter: chat.counter || 0,
        lastActivity: chat.last_activity_date || chat.date
      }))
      .sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
  }

  // Выбор чата
  const selectChat = (chat) => {
    selectedChatId.value = chat.chat_id || chat.id
    return selectedChatId.value
  }

  // Сброс выбранного чата
  const resetSelectedChat = () => {
    selectedChatId.value = null
  }

  // Загрузка файла в диск
  const uploadFileToDisk = async (fileContent, fileName = 'report.jpg', folderId = 1143900) => {
    return new Promise((resolve, reject) => {
      BX24.callMethod(
        "disk.folder.uploadfile",
        {
          id: folderId,
          data: {
            NAME: fileName,
            GENERATE_UNIQUE_NAME: true
          },
          fileContent: fileContent.replace('data:image/png;base64,', ''),
        },
        function(res) {
          if (res.error()) {
            reject(new Error(res.error().message || 'Ошибка загрузки файла'))
          } else {
            resolve(res.data())
          }
        }
      )
    })
  }

  // Отправка файла в чат
  const sendFileToChat = async (chatId, uploadId) => {
    return new Promise((resolve, reject) => {
      BX24.callMethod(
        'im.disk.file.commit',
        {
          'CHAT_ID': chatId,
          'UPLOAD_ID': uploadId,
        },
        function(res) {
          if (res.error()) {
            reject(new Error(res.error().message || 'Ошибка отправки файла'))
          } else {
            resolve(res.data())
          }
        }
      )
    })
  }

  // Отправка текстового сообщения
  const sendTextMessage = async (chatId, message) => {
    return new Promise((resolve, reject) => {
      BX24.callMethod(
        'im.message.add',
        {
          'CHAT_ID': chatId,
          'MESSAGE': message
        },
        function(res) {
          if (res.error()) {
            reject(new Error(res.error().message || 'Ошибка отправки сообщения'))
          } else {
            resolve(res.data())
          }
        }
      )
    })
  }

  // Отправка скриншота в чат
  const sendScreenshot = async (chatId, screenshotSrc, fileName = 'report.jpg') => {
    if (!chatId) {
      throw new Error('Не выбран чат')
    }

    if (!screenshotSrc) {
      throw new Error('Нет скриншота для отправки')
    }

    try {
      // 1. Загружаем файл на диск
      const uploadResult = await uploadFileToDisk(screenshotSrc, fileName)
      
      // 2. Отправляем файл в чат
      const sendResult = await sendFileToChat(chatId, uploadResult.ID)
      
      return {
        upload: uploadResult,
        send: sendResult
      }
    } catch (error) {
      console.error('Ошибка при отправке скриншота:', error)
      throw error
    }
  }

  // Открыть диалог выбора чата
  const openChatDialog = async () => {
    if (chats.value.length === 0) {
      await loadChats()
    }
    dialog.value = true
  }

  // Закрыть диалог
  const closeChatDialog = () => {
    dialog.value = false
    searchQuery.value = ''
    resetSelectedChat()
  }

  // Сброс состояния
  const resetChatState = () => {
    selectedChatId.value = null
    searchQuery.value = ''
    chatError.value = null
    uploadResult.value = null
  }

  return {
    // Состояние
    chats,
    selectedChatId,
    dialog,
    searchQuery,
    filteredChats,
    isLoadingChats,
    chatError,
    uploadResult,
    
    // Методы
    loadChats,
    selectChat,
    resetSelectedChat,
    uploadFileToDisk,
    sendFileToChat,
    sendTextMessage,
    sendScreenshot,
    openChatDialog,
    closeChatDialog,
    resetChatState,
    
    // Константы
    DEFAULT_FOLDER_ID: 1143900,
    DEFAULT_FILE_NAME: 'report.jpg'
  }
}
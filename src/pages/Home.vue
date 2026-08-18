<template>
    <!-- Прогресс-бар загрузки (как в work-schedule) -->
    <v-overlay v-model="isLoading" class="loading-overlay" persistent>
      <v-card class="loading-card pa-6 text-center">
        <v-progress-circular
          :size="80"
          :width="8"
          color="primary"
          indeterminate
          class="mb-4"
        ></v-progress-circular>
        <h3 class="mb-2">Загрузка</h3>
        <p class="text-subtitle-1 mb-2 text-medium-emphasis">{{ loadingStageText }}</p>
        <v-progress-linear
          :model-value="loadingProgress"
          :indeterminate="loadingIndeterminate"
          color="primary"
          height="8"
          rounded
          striped
          class="loading-progress"
        ></v-progress-linear>
        <p v-if="!loadingIndeterminate" class="text-caption mt-2">{{ loadingProgress }}% завершено</p>
        <p v-else class="text-caption mt-2">Пожалуйста, подождите…</p>
      </v-card>
    </v-overlay>
      <v-expansion-panels class="panel" v-model="panel">
        <v-expansion-panel>
          <v-expansion-panel-title>Фильтры</v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="filters">
              <!-- НОВЫЙ ФИЛЬТР: По пользователям (ответственным) -->
              <v-autocomplete
                v-model="filters.selected.users"
                :items="filteredUserOptions"
                item-title="NAME"
                item-value="ID"
                label="Ответственный"
                single-line
                hide-details
                variant="outlined"
                multiple
                chips
                clearable
              >
                <template v-slot:prepend-item>
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title>
                        <v-checkbox 
                          label="Выбрать всех пользователей" 
                          v-model="filters.selectAll.users" 
                          @change="() => toggleSelectAll('users')"
                          :disabled="filteredUserOptions.length === 0"
                        />
                      </v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
              </v-autocomplete>

              <!-- Фильтр по мероприятиям (регулярные мероприятия) -->
              <v-autocomplete
                v-model="filters.selected.events"
                :items="filters.value.events"
                item-title="TITLE"
                item-value="ID"
                label="Мероприятие"
                single-line
                hide-details
                variant="outlined"
                multiple
                chips
                clearable
              >
                <template v-slot:prepend-item>
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title>
                        <v-checkbox label="Выбрать все мероприятия" v-model="filters.selectAll.regularEvents" @change="() => toggleSelectAll('regularEvents')" />
                      </v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
              </v-autocomplete>

              <!-- НОВЫЙ ФИЛЬТР: По промежутку дат передачи (обновленный интерфейс) -->
              <div class="date-range">
                <v-text-field
                  v-model="dateRangeText"
                  label="Выберите диапазон дат"
                  prepend-inner-icon="mdi-calendar"
                  readonly
                  single-line
                  hide-details
                  variant="outlined"
                  clearable
                  @click="dialogCalendar = true"
                  @click:clear="clearDateRange"
                ></v-text-field>
                
                <v-dialog v-model="dialogCalendar" width="auto">
                  <v-card>
                    <v-card-title class="date-title">
                      Выберите диапазон дат
                      <v-btn icon @click="chancelDate" class="ml-auto">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </v-card-title>
                    <v-row>
                      <v-col cols="12" sm="6">
                        <v-date-picker
                          v-model="savedDate[0]"
                          title="Минимальная дата"
                        ></v-date-picker>
                      </v-col>
                      <v-col cols="12" sm="6">
                        <v-date-picker
                          v-model="savedDate[1]"
                          title="Максимальная дата"
                        ></v-date-picker>
                      </v-col>
                    </v-row>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="primary" @click="confirmDate">Готово</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <div class="buttons">
        <v-btn color="primary" @click="disableFilters()">отключить фильтры</v-btn>
        <v-btn color="info" @click="getData()">получить данные</v-btn>
        <v-btn color="success" class="takeScreenshot" @click="takeScreenshot">Создать скриншот</v-btn>
      </div>

      <!-- Две горизонтальные диаграммы -->
      <div class="charts-row mt-8">
        <div class="chart-container">
          <h3 class="chart-header">Сумма сделок по ответственным</h3>
          <Bar
            v-if="userChartData.labels.length"
            :data="userChartData"
            :options="horizontalBarOptions"
          />
          <p v-else>Нет данных по ответственным</p>
        </div>
        <div class="chart-container">
          <h3 class="chart-header">Сумма сделок по месяцам</h3>
          <Bar
            v-if="monthChartData.labels.length"
            :data="monthChartData"
            :options="horizontalBarOptions"
          />
          <p v-else>Нет данных по месяцам</p>
        </div>
      </div>

      <!-- Блок с круговой и лепестковой диаграммами -->
      <div class="charts-row mt-12">
        <div class="chart-container">
          <h3 class="chart-header">Распределение сумм по ответственным</h3>
          <Pie
            v-if="pieChartData.labels.length"
            :data="pieChartData"
            :options="pieChartOptions"
          />
          <p v-else>Нет данных для круговой диаграммы</p>
        </div>
        <div class="chart-container">
          <h3 class="chart-header">Сумма сделок по месяцам (лепестковая)</h3>
          <Radar
            v-if="radarChartData.labels.length"
            :data="radarChartData"
            :options="radarChartOptions"
          />
          <p v-else>Нет данных для лепестковой диаграммы</p>
        </div>
      </div>

      <!-- Итоговая сумма под гистограммами -->
      <div class="total-sum-container" v-if="totalDealsSum > 0">
        <h4>Общая сумма всех сделок: <span class="total-sum">{{ formatNumber(totalDealsSum) }}</span></h4>
      </div>

    <v-data-table
      :headers="headersStatuses"
      :items="processedItems"
      :items-per-page="10"
      class="elevation-1"
    >
      <template v-for="header in allHeadersStatuses" :key="header.key" v-slot:[`item.${header.key}`]="{ item }">
        <template v-if="/^\d{4}$/.test(header.key) || header.key === 'summ'">{{ formatNumber(item[header.key]) }}</template>
        <template v-else>{{ item[header.key] }}</template>
      </template>
      <template v-slot:body.append="{  }">
        <tr v-if="items.length > 0">
          <template v-for="(header, i) in allHeadersStatuses">
                  <td>
                    <span v-if="header.key === 'status'">{{totalRowStatuse[header.key]}}</span>
                    <span v-else class="center">{{/^\d{4}$/.test(header.key) || header.key === 'summ' ? formatNumber(totalRowStatuse[header.key]) : totalRowStatuse[header.key]}}</span>
                  </td>
          </template>
        </tr>
      </template>
    </v-data-table>

    <!-- Таблица всех полученных сделок -->
    <v-card class="mt-6">
      <v-card-title class="bg-primary text-white">
        Все полученные сделки
        <v-spacer></v-spacer>
        <v-text-field
          v-model="dealsSearch"
          label="Поиск по сделкам"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          hide-details
          single-line
          density="compact"
          class="search-field"
          bg-color="white"
        ></v-text-field>
      </v-card-title>
      <v-data-table
        :headers="dealsHeaders"
        :items="filteredDeals"
        :items-per-page="15"
        class="elevation-1 deals-table"
        :loading="isLoading"
        loading-text="Загрузка сделок..."
      >
        <template v-slot:item.TITLE="{ item }">
          <a 
            :href="`${b24BaseUrl}/crm/deal/details/${item.ID}/`" 
            target="_blank"
            class="deal-link"
          >
            {{ item.TITLE }}
          </a>
        </template>
        <template v-slot:item.DATE="{ item }">
          {{ formatDate(item.UF_CRM_1744096783472) }}
        </template>
        <template v-slot:item.OPPORTUNITY="{ item }">
          {{ formatNumber(item.OPPORTUNITY) }}
        </template>
        <template v-slot:item.COMPANY_ID="{ item }">
          {{ getCompanyName(item.COMPANY_ID) }}
        </template>
        <template v-slot:item.EVENT="{ item }">
          {{ getEventName(item.UF_CRM_1742797326) }}
        </template>
        <template v-slot:item.ASSIGNED_BY_ID="{ item }">
          {{ getUserName(item.ASSIGNED_BY_ID) }}
        </template>
        <template v-slot:no-data>
          <div class="text-center pa-4">
            <v-icon icon="mdi-alert" size="large" color="warning" class="mb-2"></v-icon>
            <p>Нет данных по сделкам</p>
          </div>
        </template>
      </v-data-table>
    </v-card>
    
    <img v-if="screenshotSrc" ref="screenshotImg" :src="screenshotSrc" alt="Скриншот страницы" id="screenshotImg"/>
  <div>
    <!-- Диалоговое окно выбора чата -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title class="headline">
          Выберите чат для отправки сообщения
        </v-card-title>

        <v-card-text>
          <!-- Поле поиска чатов -->
          <v-text-field
            v-model="search"
            label="Поиск чатов"
            append-icon="mdi-magnify"
            clearable
            class="chats-input"
          ></v-text-field>

          <!-- Список доступных чатов -->
          <v-list>
            <v-list-item
              v-for="chat in filteredChats"
              :key="chat.chat_id"
              @click="selectChat(chat)"
            >
              <v-list-item-content>
                <v-list-item-title>{{ chat.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ chat.message.text || 'Нет сообщений' }}
                </v-list-item-subtitle>
              </v-list-item-content>

              <v-list-item-action>
                <v-icon v-if="selectedChatId === chat.chat_id" color="primary">
                  mdi-check
                </v-icon>
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="dialog = false">Отмена</v-btn>
          <v-btn
            color="primary"
            :disabled="!selectedChatId"
            @click="sendMessage"
          >
            Отправить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
      <v-dialog v-model="successDialog" max-width="500" class="successDialog">
        <v-card>
          <v-card-title class="success white--text">Успешно выполнено!</v-card-title>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="successDialog = false">закрыть</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="errorDialog" max-width="500" class="errorDialog">
        <v-card>
          <v-card-title class="error white--text">Ошибка!</v-card-title>
          <v-card-text color="error" class="v-card-text mt-4 text-center">{{ errorDisplay }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="errorDialog = false">закрыть</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Bar, Pie, Radar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { callApi } from '../functions/callApi';
import moment from 'moment';
import 'moment/dist/locale/ru';
moment.locale('ru');
import html2canvas from 'html2canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';

const b24BaseUrl = (import.meta.env.VITE_B24_BASE_URL || 'https://example.bitrix24.ru').replace(/\/$/, '');

ChartJS.register(
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, 
  ArcElement, RadialLinearScale, PointElement, LineElement, Filler,
  ChartDataLabels // Добавляем плагин для подписей
)

// Новые переменные для выбора дат
const dialogCalendar = ref(false);
const savedDate = ref([]);

// Вычисляемое поле для отображения выбранного диапазона дат
const dateRangeText = computed(() => {
  if (!filters.value.dateRange.from || !filters.value.dateRange.to) return '';
  
  const fromDate = new Date(filters.value.dateRange.from);
  const toDate = new Date(filters.value.dateRange.to);
  
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return `${fromDate.toLocaleDateString('ru-RU', options)} - ${toDate.toLocaleDateString('ru-RU', options)}`;
});

// Новые функции для работы с датами
function chancelDate() {
  dialogCalendar.value = false;
}

function confirmDate() {
  if (savedDate.value[0] && savedDate.value[1]) {
    filters.value.dateRange.from = savedDate.value[0];
    filters.value.dateRange.to = savedDate.value[1];
  }
  dialogCalendar.value = false;
}

const errorDisplay = ref('');
const successDialog = ref(false);
const errorDialog = ref(false);
const isLoading = ref(true);
const loadingProgress = ref(0);
const loadingStageText = ref('Инициализация приложения…');
const loadingIndeterminate = ref(false);

function setLoadingStage(progress, text) {
  loadingIndeterminate.value = false;
  loadingProgress.value = progress;
  if (text) loadingStageText.value = text;
}
const items = ref([]);
const allDealsData = ref([]); // Все полученные сделки
const dealsSearch = ref(''); // Поиск по сделкам
const headers = ref([
    { title: 'Мероприятие', key: 'EVENT', with: '25%'},
    { title: 'Компания', key: 'COMPANY_ID'},
]);
const panel = ref(true);

// Общая сумма всех сделок
const totalDealsSum = computed(() => {
  if (!allDealsData.value.length) return 0;
  return allDealsData.value.reduce((sum, deal) => {
    return sum + (parseFloat(deal.OPPORTUNITY) || 0);
  }, 0);
});

// Заголовки для таблицы всех сделок
const dealsHeaders = ref([
  { title: 'Название', key: 'TITLE', align: 'left' },
  { title: 'Мероприятие', key: 'EVENT', align: 'left' },
  { title: 'Компания', key: 'COMPANY_ID', align: 'left' },
  { title: 'Ответственный', key: 'ASSIGNED_BY_ID', align: 'left' },
  { title: 'Сумма', key: 'OPPORTUNITY', align: 'right' },
  { title: 'Дата передачи', key: 'DATE', align: 'center' }
]);

const headersStatuses = ref([
  { title: 'Статус участия', key: 'UF_CRM_1745995594'},
  { title: 'Сумма', key: 'OPPORTUNITY'},
]);

const allHeadersStatuses = computed(() => {
  const result = [];
  headersStatuses.value.forEach(header => {
    if (header.children) {
      result.push(...header.children);
    } else {
      result.push(header);
    }
  });
  return result;
});

const allHeaders = computed(() => {
  const result = [];
  headers.value.forEach(header => {
    if (header.children) {
      result.push(...header.children);
    } else {
      result.push(header);
    }
  });
  return result;
});

// Фильтрация сделок по поиску
const filteredDeals = computed(() => {
  if (!dealsSearch.value) return allDealsData.value;
  
  const searchTerm = dealsSearch.value.toLowerCase();
  return allDealsData.value.filter(deal => {
    return (
      (deal.TITLE && deal.TITLE.toLowerCase().includes(searchTerm)) ||
      (getEventName(deal.UF_CRM_1742797326) && getEventName(deal.UF_CRM_1742797326).toLowerCase().includes(searchTerm)) ||
      (getCompanyName(deal.COMPANY_ID) && getCompanyName(deal.COMPANY_ID).toLowerCase().includes(searchTerm)) ||
      (getUserName(deal.ASSIGNED_BY_ID) && getUserName(deal.ASSIGNED_BY_ID).toLowerCase().includes(searchTerm)) ||
      (deal.OPPORTUNITY && String(deal.OPPORTUNITY).includes(searchTerm)) ||
      (deal.UF_CRM_1744096783472 && formatDate(deal.UF_CRM_1744096783472).toLowerCase().includes(searchTerm))
    );
  });
});

const dialog = ref(false)
const search = ref('')
const selectedChatId = ref(null)

const filteredChats = computed(() => {
  if (!search.value) return chats.value
  return chats.value.filter(chat =>
    chat.title.toLowerCase().includes(search.value.toLowerCase())
  )
})

function selectChat(chat) {
  selectedChatId.value = chat.chat_id;
}

async function sendMessage() {
  try {
    if (!selectedChatId.value) return;
    loadingIndeterminate.value = true;
    loadingStageText.value = 'Отправка скриншота в выбранный чат…';
    isLoading.value = true;
    let result = '';
    await new Promise((resolve) => {
      BX24.callMethod(
        "disk.folder.uploadfile",
        {
            id: 1143900,
            data: {
                NAME: "report.jpg"
            },
            fileContent: document.getElementById('screenshotImg').src.replace('data:image/png;base64,', ''),
            generateUniqueName: true,
        },
        function (res)
        {
               result = res.data();
              resolve();
        }
      );
    });

    BX24.callMethod(
        'im.disk.file.commit',
        {
            'CHAT_ID': selectedChatId.value,
            'UPLOAD_ID': result.ID,
        },
        function(res){}
    );
  } catch (error) {
    errorDisplay.value = error.message || 'Произошла ошибка при отправке сообщения';
    errorDialog.value = true;
  } finally {
    screenshotSrc.value = null;
    dialog.value = false;
    successDialog.value = true;
    loadingIndeterminate.value = false;
    isLoading.value = false;
  }
}
const chats = ref([]);
const screenshotSrc = ref(null); // ссылка на изображение скриншота
async function takeScreenshot() {
  document.querySelector(".v-expansion-panels").style.display = 'none';
  document.querySelector(".buttons").style.display = 'none';
  document.querySelector(".takeScreenshot").style.display = 'none';
  try {
    loadingIndeterminate.value = true;
    loadingStageText.value = 'Создание скриншота страницы…';
    isLoading.value = true;
    // рисуем весь документ body на холсте
    const canvas = await html2canvas(document.body);
    const imageSrc = canvas.toDataURL('image/png'); // сохраняем изображение в base64
    screenshotSrc.value = imageSrc; // устанавливаем ссылку на изображение
  } catch (error) {
    errorDisplay.value = error.message || 'Произошла ошибка при создании скриншота';
    errorDialog.value = true;
  } finally {
    document.querySelector(".v-expansion-panels").style.display = 'flex';
    document.querySelector(".buttons").style.display = 'flex';
    document.querySelector(".takeScreenshot").style.display = 'block';
    loadingIndeterminate.value = false;
    isLoading.value = false;
  }
  
  try {
    if(chats.value.length === 0){
      const result = await callApi('im.recent.list', {'SKIP_OPENLINES': 'Y'}, [], null, null, null);
      chats.value = JSON.parse(JSON.stringify(result));
    }
    dialog.value = true;
  } catch (error) {
    errorDisplay.value = error.message || 'Произошла ошибка при загрузке списка чатов';
    errorDialog.value = true;
  }
}

const toggleSelectAll = (type) => {
  try {
    if (type === 'users') {
      // Для пользователей используем отфильтрованный список
      if (filters.value.selectAll[type]) {
        filters.value.selected[type] = filteredUserOptions.value.map(item => item.ID);
      } else {
        filters.value.selected[type] = [];
      }
    } else {
      // Для остальных типов как раньше
      if (filters.value.selectAll[type]) {
        filters.value.selected[type] = typeof filters.value.value[type][0] === 'object' 
          ? filters.value.value[type].map(item => item.ID) 
          : filters.value.value[type];
      } else {
        filters.value.selected[type] = [];
      }
    }
  } catch (error) {
    errorDisplay.value = error.message || 'Произошла ошибка при выборе элементов';
    errorDialog.value = true;
  }
};

function findEventName(id, fields) {
  try {
    if(id === "0"){
      return null;
    }

    let foundItem = fields.find(item => +item.ID === +id);
    if(foundItem?.VALUE){
      return foundItem.VALUE;
    }else if(foundItem?.TITLE){
      return foundItem.TITLE;
    }else{
      return null;
    }
  } catch (error) {
    console.error('Ошибка в findEventName:', error);
    return null;
  }
}

// Получение названия компании по ID
function getCompanyName(companyId) {
  if (!companyId || !filters.value.value.companies) return companyId;
  const company = filters.value.value.companies.find(c => +c.ID === +companyId);
  return company?.TITLE || companyId;
}

// НОВЫЙ МЕТОД: Получение имени пользователя по ID
function getUserName(userId) {
  if (!userId || !filters.value.value.users) return `Пользователь ${userId}`;
  const user = filters.value.value.users.find(u => +u.ID === +userId);
  return user?.NAME || `Пользователь ${userId}`;
}

// Получение названия мероприятия по ID
function getEventName(eventId) {
  if (!eventId || !filters.value.value.events) return eventId;
  const event = filters.value.value.events.find(e => +e.ID === +eventId);
  return event?.TITLE || eventId;
}

// Форматирование даты
function formatDate(dateString) {
  if (!dateString) return '—';
  return moment(dateString).format('DD.MM.YYYY');
}

function disableFilters(){
  try {
    panel.value = false;
    for (let i = 0; i < Object.keys(filters.value.selectAll).length; i++) {
      filters.value.selectAll[Object.keys(filters.value.selectAll)[i]] = false;
      filters.value.selected[Object.keys(filters.value.selected)[i]] = [];
    }
    // Очищаем диапазон дат
    clearDateRange();
  } catch (error) {
    errorDisplay.value = error.message || 'Произошла ошибка при отключении фильтров';
    errorDialog.value = true;
  }
}

// НОВЫЙ МЕТОД: Очистка диапазона дат
function clearDateRange() {
  filters.value.dateRange.from = '';
  filters.value.dateRange.to = '';
  savedDate.value = [];
}

function mergedData(data) {
  try {
    const result = [];
    
    data.forEach(item => {
      // Создаем отдельную запись для каждой компании
      const entry = {
        COMPANY_ID: item.COMPANY_ID,
        EVENT: item.EVENT,
        regularEvent: item.regularEvent,
        CITY: item.CITY,
      };
      
      // Перебираем все года в объекте (2023, 2024 и т.д.)
      for (const [prop, value] of Object.entries(item)) {
        if (/^\d{4}$/.test(prop)) {
          // Это свойство - год (например "2023")
          const year = prop;
          const statusKey = `${year}_status`;
          const status = item[statusKey];
          
          // Добавляем год и статус к записи
          entry[year] = value;
          entry[statusKey] = status;
        }
      }
      
      result.push(entry);
    });
    
    return result;
  } catch (error) {
    console.error('Ошибка в mergedData:', error);
    return [];
  }
}
// Создаем объект для итоговой строки
const totalRow = ref({
  total: 0,
});

const filters = ref({
  value: {
    'companies': [],
    'events': [],
    'years': [],
    'statuses': [],
    'regularEvents': [],
    'users': [], // НОВОЕ: список пользователей
  },
  selected: {
    companies: [],
    events: [],
    years: [],
    statuses: [],
    regularEvents: [],
    users: [], // НОВОЕ: выбранные пользователи
  },
  selectAll: {
    'companies': false,
    'events': false,
    'years': false,
    'statuses': false,
    'regularEvents': false,
    'users': false, // НОВОЕ: выбор всех пользователей
  },
  // НОВОЕ: диапазон дат
  dateRange: {
    from: '',
    to: ''
  }
});

let fields = [];
const cities = ref([]);
async function getFilters(){
  let filtersLoadedOk = true;
  try {
    setLoadingStage(8, 'Загрузка полей сделок…');
    fields = await callApi("crm.deal.fields", {}, ["OPPORTUNITY", "UF_CRM_1744096783472"], null, null, null);
    setLoadingStage(22, 'Определение доступных годов…');
    filters.value.value.years = await new Promise((resolve) => {
      BX24.callMethod("crm.deal.list", {
        order: {"UF_CRM_1744096783472": "ASC"},
        select: ["UF_CRM_1744096783472"],
        filter: {"!UF_CRM_1744096783472": "null"},
      }, (res) => {
        if (res.data()) {
          const years = [];
          const currentYear = moment().year();
          const startYear = res.data().length > 0 ? moment(res.data()[0].UF_CRM_1744096783472).format('YYYY') : moment().year();
          for (let year = startYear; year <= currentYear; year++) {
            years.push(+year);
          }
          resolve(years);
        } else {
          resolve([]);
        }
      });
    });

    setLoadingStage(38, 'Загрузка компаний…');
    filters.value.value.companies = await callApi("crm.company.list", {}, [], null, null, null) || [];
    setLoadingStage(52, 'Загрузка мероприятий…');
    filters.value.value.events = await callApi("crm.item.list", {}, ["id","title","ufCrm38_1750326807","ufCrm38_1753082280"], 1052, null, null) || [];
    
    filters.value.value.events.forEach((item) => {
      if ('id' in item) {
        // Создаем новый ключ 'ID'
        item['ID'] = item.id;
        item['TITLE'] = item.title;
        item['CITY'] = item.ufCrm38_1753082280;
        // Удаляем старый ключ 'id'
        delete item.id;
        delete item.title;
        delete item.ufCrm38_1753082280;
      }
    });

    setLoadingStage(66, 'Загрузка статусов участия…');
    filters.value.value.statuses = await callApi("crm.item.list", {}, ["id","title"], 1080, null, null) || [];
    filters.value.value.statuses.forEach((item) => {
      if ('id' in item) {
        // Создаем новый ключ 'ID'
        item['ID'] = item.id;
        item['TITLE'] = item.title;
        // Удаляем старый ключ 'id'
        delete item.id;
        delete item.title;
      }
    });

    setLoadingStage(78, 'Загрузка регулярных мероприятий…');
    filters.value.value.regularEvents = await callApi("crm.item.list", {}, ["id","title","ufCrm54_1754646027539"], 1084, null, null) || [];
    filters.value.value.regularEvents.forEach((item) => {
      if ('id' in item) {
        // Создаем новый ключ 'ID'
        item['ID'] = item.id;
        item['TITLE'] = item.title;
        // Удаляем старый ключ 'id'
        delete item.id;
        delete item.title;
      }
    });

    // НОВОЕ: Загрузка пользователей
    setLoadingStage(92, 'Загрузка пользователей…');
    filters.value.value.users = await callApi("user.get", {}, [], null, null, null) || [];
    filters.value.value.users = filters.value.value.users.map(user => ({
      ID: user.ID,
      NAME: `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim() || user.EMAIL || `Пользователь ${user.ID}`
    }));

  } catch (error) {
    filtersLoadedOk = false;
    console.error('Ошибка при загрузке фильтров:', error);
    errorDisplay.value = 'Не удалось загрузить фильтры. Приложение будет работать с ограниченной функциональностью.';
    errorDialog.value = true;
  } finally {
    if (filtersLoadedOk) {
      setLoadingStage(100, 'Фильтры загружены');
    } else {
      loadingStageText.value = 'Ошибка при загрузке фильтров';
      loadingProgress.value = 0;
    }
    loadingIndeterminate.value = false;
    isLoading.value = false;
  }
}
const filteredUserOptions = computed(() => {
  // Если нет сделок, возвращаем пустой массив
  if (!allDealsData.value.length) return [];
  
  // Получаем уникальные ID пользователей из сделок
  const userIdsWithDeals = new Set();
  allDealsData.value.forEach(deal => {
    if (deal.ASSIGNED_BY_ID) {
      userIdsWithDeals.add(String(deal.ASSIGNED_BY_ID));
    }
  });
  
  // Фильтруем список пользователей, оставляя только тех, у кого есть сделки
  return (filters.value.value.users || []).filter(user => 
    userIdsWithDeals.has(String(user.ID))
  );
});
const processedItems = ref([]);

onMounted(async () => {
  try {
    await getFilters();
    await getData();
  } catch (error) {
    console.error('Критическая ошибка при инициализации:', error);
    errorDisplay.value = 'Произошла ошибка при загрузке приложения. Некоторые функции могут быть недоступны.';
    errorDialog.value = true;
    loadingIndeterminate.value = false;
    isLoading.value = false;
  } finally {
    loadingIndeterminate.value = false;
    isLoading.value = false;
  }
});

const totalRowStatuse = ref({});
const getTable = (data, uniqueYears) => {
  try {
    const statuses = data.map(item => item.UF_CRM_1745995594?.[0])
      .filter((status, index, self) => status && self.indexOf(status) === index)
      .map(str => ({ status: str }));

    data.forEach((item) => {
      const foundObject = statuses.find(obj => obj.status === item.UF_CRM_1745995594?.[0]);
      if(foundObject){
        const year = moment(item.UF_CRM_1744096783472).format('YYYY');
        if(foundObject[year]){
          foundObject[year] += parseInt(item.OPPORTUNITY) || 0;
          foundObject[year + "_amount"]++;
        }else{
          foundObject[year] = parseInt(item.OPPORTUNITY) || 0;
          foundObject[year + "_amount"] = 1;
        }
      }
    });

    statuses.forEach((item) => {
      item.status = findEventName(item.status, filters.value.value.statuses) || item.status;
      for (let [prop, value] of Object.entries(item)) {
        if (/^\d{4}$/.test(prop)) {
          if(item.summ){
            item.summ += value;
          }else{
            item.summ = value;
          }
          item[prop + '_summ'] = value;
          item[prop] = value;
        }
      }
      item.summ = item.summ || 0;
    });

    const totalRow = statuses.reduce((totals, item) => {
      for (const key in item) {
        let newKey = key.replace(/_summ$/, '');
        if (/^\d{4}_summ$/.test(key)) {
          totals[newKey] = (totals[newKey] || 0) + item[key];
          totals.summ = (totals.summ || 0) + item[key];
        }else if(/^\d{4}_amount$/.test(key)){
          totals[newKey] = (totals[newKey] || 0) + item[key];
        }
      }
      return totals;
    }, {});
    for (const key in totalRow) {
        if (/^\d{4}$/.test(key) || key === 'summ') {
          totalRow[key] = totalRow[key];
        }
    }

    totalRow.status = 'Итого:';
    totalRowStatuse.value = totalRow;
    processedItems.value = statuses;
    headersStatuses.value = [
      {title: 'Статус', key: 'status'},
    ].concat(
      uniqueYears.map(year => ({
        title: year,
        key: year,
        align: 'center',
        children: [
          {title: 'Количество компаний', key: year + '_amount'},
          {title: 'Сумма', key: year},
        ]
      }))
    ).concat({ title: 'Сумма', key: 'summ', with: '25%'});
  } catch (error) {
    console.error('Ошибка в getTable:', error);
    errorDisplay.value = 'Произошла ошибка при формировании таблицы статусов';
    errorDialog.value = true;
  }
}

const getAllDeals = async (filterEvents, filterStatuses, filterCompaines, filterUsers, dateFrom, dateTo, filterRegularEvents) => {
      let allDeals = [];
      let start = 0;
      const batchSize = 50; // Размер пачки для запроса
      let hasMore = true;
console.log(filterEvents);
      // Формируем фильтры
      const localFilters = {
        "@UF_CRM_1742797326": filterEvents,
        '@UF_CRM_1745995594': filterStatuses,
        'COMPANY_ID': filterCompaines,
        ">UF_CRM_1744096783472": "01.01.2000",
      };

      // НОВОЕ: Добавляем фильтр по пользователям, если выбраны
      if (filterUsers && filterUsers.length > 0) {
        localFilters['ASSIGNED_BY_ID'] = filterUsers;
      }

      // НОВОЕ: Добавляем фильтр по дате "с"
      if (dateFrom) {
        localFilters['>=UF_CRM_1744096783472'] = dateFrom;
      }

      // НОВОЕ: Добавляем фильтр по дате "по"
      if (dateTo) {
        localFilters['<=UF_CRM_1744096783472'] = dateTo;
      }

      // НОВОЕ: Добавляем фильтр по регулярным мероприятиям (ufCrm38_1750326807)
      if (filterRegularEvents && filterRegularEvents.length > 0) {
        // Сначала получаем все события (мероприятия), которые соответствуют выбранным регулярным мероприятиям
        const regularEventIds = filterRegularEvents;
        
        const events = filters.value.value.events || [];
        console.log(events);
        // Фильтруем события, оставляя только те, у которых ufCrm38_1750326807 (регулярное мероприятие) входит в выбранные
        const filteredEventIds = events
          .filter(event => regularEventIds.includes(+event.ufCrm38_1750326807))
          .map(event => event.ID);
        
        // Если есть отфильтрованные события, добавляем их в фильтр
        if (filteredEventIds.length > 0) {
          localFilters['@UF_CRM_1742797326'] = filteredEventIds;
        } else {
          // Если нет событий, соответствующих фильтру, возвращаем пустой массив
          return [];
        }
      }

      while (hasMore) {
        try {
          const response = await fetch("https://b24market.webtm.ru/test/handler.php", {
            method: "POST",
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              "method": "crm.deal.list",
              "filters": localFilters,
              "select": ["UF_CRM_1744096783472", "ID","TITLE","UF_CRM_1742797326", "UF_CRM_1745995594", "COMPANY_ID", "OPPORTUNITY", "ASSIGNED_BY_ID"],
              "start": start,
              "limit": batchSize
            })
          });

          const data = (await response.json()).data;

          if (data.total >= start) {
            allDeals = allDeals.concat(data.data);
            start += batchSize;
            if (data.total <= start) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error('Ошибка при получении сделок:', error);
          hasMore = false;
        }
      }

      return allDeals;
    };

const firstItemToString = arr => (arr && arr.length > 0 ? parseInt(arr[0]) : '');
const getData = async() => {
  try {
    setLoadingStage(5, 'Подготовка параметров отчёта…');
    isLoading.value = true;
    headers.value = [
      { title: 'Мероприятие', key: 'EVENT', with: '25%'},
      { title: 'Компания', key: 'COMPANY_ID'},
    ];
    headersStatuses.value = [
      { title: 'Статус участия', key: 'UF_CRM_1745995594'},
      { title: 'Сумма', key: 'OPPORTUNITY'},
    ];
    totalRow.value = {
      total: 0,
    };
    const filterEvents = filters.value.selected.events.length === 0 ? (filters.value.value.events || []).map(item => item.ID) : filters.value.selected.events;
    const filterStatuses = filters.value.selected.statuses.length === 0 ? (filters.value.value.statuses || []).map(item => item.ID) : filters.value.selected.statuses;
    const filterCompaines = filters.value.selected.companies.length === 0 ? (filters.value.value.companies || []).map(item => item.ID) : filters.value.selected.companies;
    // НОВОЕ: Получаем выбранных пользователей
    const filterUsers = filters.value.selected.users.length === 0 ? (filters.value.value.users || []).map(item => item.ID) : filters.value.selected.users;
    // НОВОЕ: Получаем выбранные регулярные мероприятия
    const filterRegularEvents = filters.value.selected.regularEvents.length === 0 ? null : filters.value.selected.regularEvents;
    // НОВОЕ: Получаем даты из диапазона
    const dateFrom = filters.value.dateRange.from || null;
    const dateTo = filters.value.dateRange.to || null;
    
    setLoadingStage(28, 'Загрузка сделок по выбранным фильтрам…');
    let localItems = await getAllDeals(filterEvents, filterStatuses, filterCompaines, filterUsers, dateFrom, dateTo, filterRegularEvents);

    // Сохраняем все сделки для отображения в отдельной таблице
    allDealsData.value = [...localItems];
    
    const uniqueCompanies = Array.from(new Set(localItems.map(item => item.COMPANY_ID)));
    setLoadingStage(48, 'Загрузка названий компаний…');
    const companies = await callApi("crm.company.list", {"ID": [...uniqueCompanies]}, [], null, null, null) || [];

    setLoadingStage(58, 'Загрузка справочника городов…');
    cities.value = await callApi("crm.item.list", {}, ["id","title"], 1094, null, null) || [];
    cities.value.forEach((item) => {
      if ('id' in item) {
        // Создаем новый ключ 'ID'
        item['ID'] = item.id;
        item['TITLE'] = item.title;
        // Удаляем старый ключ 'id'
        delete item.id;
        delete item.title;
      }
    });

    setLoadingStage(68, 'Расчёт диаграмм и агрегатов…');
    // --- Группировка для диаграмм ---
    const userSums = {};
    const monthSums = {};

    localItems.forEach(item => {
      // По ответственным
      const userId = item.ASSIGNED_BY_ID;
      const amount = parseFloat(item.OPPORTUNITY) || 0;
      if (userId) {
        userSums[userId] = (userSums[userId] || 0) + amount;
      }

      // По месяцам (без деления по годам)
      if (item.UF_CRM_1744096783472) {
        const monthKey = moment(item.UF_CRM_1744096783472).format('MMM YYYY'); // Только месяц и год
        monthSums[monthKey] = (monthSums[monthKey] || 0) + amount;
      }
    });

    // Преобразуем в массивы для диаграммы (горизонтальный бар)
    const sortedUsers = Object.entries(userSums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // топ-10
    
    // Используем имена пользователей вместо ID
    const userLabels = sortedUsers.map(([id]) => getUserName(id));
    
    userChartData.value = {
      labels: userLabels,
      datasets: [{
        label: 'Сумма сделок (₽)',
        data: sortedUsers.map(([, sum]) => sum),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    };

    // Данные для круговой диаграммы (на основе данных левой гистограммы)
    pieChartData.value = {
      labels: userLabels,
      datasets: [{
        label: 'Сумма сделок (₽)',
        data: sortedUsers.map(([, sum]) => sum),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',   // синий (вместо розового)
          'rgba(75, 192, 192, 0.8)',   // бирюзовый
          'rgba(153, 102, 255, 0.8)',  // фиолетовый
          'rgba(255, 159, 64, 0.8)',   // оранжевый
          'rgba(199, 199, 199, 0.8)',  // серый
          'rgba(83, 102, 255, 0.8)',   // сине-фиолетовый
          'rgba(54, 162, 132, 0.8)',   // зеленовато-синий
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',   // синий (вместо розового)
          'rgba(75, 192, 192, 1)',   // бирюзовый
          'rgba(153, 102, 255, 1)',  // фиолетовый
          'rgba(255, 159, 64, 1)',   // оранжевый
          'rgba(199, 199, 199, 1)',  // серый
          'rgba(83, 102, 255, 1)',   // сине-фиолетовый
          'rgba(54, 162, 132, 1)',   // зеленовато-синий
        ],
        borderWidth: 1
      }]
    };
    const sortedMonths = Object.entries(monthSums)
      .sort(([a], [b]) => {
        // Сортируем по дате (месяц/год)
        return moment(a, 'MMM YYYY').toDate() - moment(b, 'MMM YYYY').toDate();
      });
    
    monthChartData.value = {
      labels: sortedMonths.map(([month]) => month),
      datasets: [{
        label: 'Сумма сделок (₽)',
        data: sortedMonths.map(([, sum]) => sum),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    };

    // Данные для лепестковой диаграммы (на основе данных правой гистограммы)
    radarChartData.value = {
      labels: sortedMonths.map(([month]) => month),
      datasets: [{
        label: 'Сумма сделок по месяцам',
        data: sortedMonths.map(([, sum]) => sum),
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2
      }]
    };
    // --- Конец группировки для диаграмм ---

    localItems = localItems.map(item => ({
      ...item,
      EVENT: findEventName(item.UF_CRM_1742797326, filters.value.value.events),
      COMPANY_ID: findEventName(item.COMPANY_ID, companies),
      [moment(item.UF_CRM_1744096783472).format('YYYY')]: (+item.OPPORTUNITY).toFixed(0),
      [moment(item.UF_CRM_1744096783472).format('YYYY') + '_status']: findEventName(firstItemToString(item.UF_CRM_1745995594), filters.value.value.statuses),
      regularEvent: filters.value.value.events?.find(event => event.ID === +item.UF_CRM_1742797326)?.ufCrm38_1750326807,
      CITY: cities.value.find(city => city.ID === +filters.value.value.events?.find(event => event.ID === +item.UF_CRM_1742797326)?.CITY)?.TITLE,
    }))
    // Фильтрация по regularEvent, если список значений указан
    .filter(item => {
      // Если список значений для фильтрации пуст - пропускаем фильтрацию
      if (!filters.value.selected.regularEvents || filters.value.selected.regularEvents.length === 0) {
        return true;
      }
      // Проверяем, содержит ли regularEvent элемента значение из списка фильтрации
      return filters.value.selected.regularEvents.includes(+item.regularEvent);
    });
    
    const itemsToTable = localItems;
    const uniqueYears = localItems
      .map(item => moment(item.UF_CRM_1744096783472).format('YYYY')) // Получаем массив годов
      .filter((year, index, self) => self.indexOf(year) === index); // Оставляем только уникальные года
    
    setLoadingStage(82, 'Группировка данных по годам и статусам…');
    localItems = mergedData(localItems);
    getTable(itemsToTable, uniqueYears);

    setLoadingStage(93, 'Формирование таблиц отчёта…');
    const yearObjects = uniqueYears.map(year => ({
      title: year,
      key: year,
      align: 'center',
      children: [
        {title: 'Статус участия', key: year + '_status'},
        {title: 'Сумма', key: year},
      ]
    }));

    const yearSums = {};
    uniqueYears.forEach(year => {
      yearSums[year] = 0;
    });

    // Рассчитываем суммы по каждому году
    localItems.forEach(item => {
      uniqueYears.forEach(year => {
        if (item[year]) {
          const value = parseInt(item[year]) || 0;
          yearSums[year] = (yearSums[year] || 0) + value;
        }
      });
    });

    localItems.map(item => {
      const years = {};
      item.total = 0;
      // Перебираем все свойства объекта
      Object.keys(item).forEach(key => {
        // Проверяем, является ли ключ годом (4 цифры)
        if (/^\d{4}$/.test(key)) {
          const value = parseFloat(item[key]) || 0;
          years[key] = value;
          item.total += value;
          totalRow.value.total += value;
        }
      });
    });

    // Добавляем суммы и статусы в итоговую строку
    uniqueYears.forEach(year => {
      if (yearSums[year] > 0) {
        totalRow.value[year] = formatNumber(yearSums[year]);
      } else {
        totalRow.value[year] = 0;
      }
    });
    totalRow.value.total = formatNumber(totalRow.value.total);
    headers.value = headers.value.concat(yearObjects).concat({ title: 'Сумма', key: 'total', with: '25%'});
    //items.value = mergeByRegularEvent(localItems);
    items.value = localItems;
    joinArrayPropsInPlace(items.value);
    setLoadingStage(100, 'Отчёт готов');
  } catch (error) {
    console.error('Ошибка в getData:', error);
    errorDisplay.value = 'Произошла ошибка при загрузке данных';
    errorDialog.value = true;
    loadingStageText.value = 'Ошибка при загрузке данных';
    loadingProgress.value = 0;
  } finally {
    document.querySelector(".v-expansion-panels").style.display = 'flex';
    document.querySelector(".buttons").style.display = 'flex';
    document.querySelector(".takeScreenshot").style.display = 'block';
    loadingIndeterminate.value = false;
    isLoading.value = false;
  }
};

function joinArrayPropsInPlace(arr) {
  try {
    arr.forEach(obj => {
      Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (Array.isArray(val)) {
          obj[key] = val
            .map(v => v === null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)))
            .join(', ');
        }
      });
    });
  } catch (error) {
    console.error('Ошибка в joinArrayPropsInPlace:', error);
  }
}

function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Ошибка в deepClone:', error);
    return obj;
  }
}

function mergeByRegularEvent(items) {
  try {
    const map = new Map();

    for (const item of items) {
      let id;
      const regularEvent = filters.value.value.regularEvents?.find(regularEvent => regularEvent.ID == item.regularEvent);

      // объединяем только когда box === 'N' или box === 0 (так указано в условии)
      const shouldMerge = regularEvent?.ufCrm54_1754646027539 === 'N';
      if (!shouldMerge) {
        // если не нужно объединять — просто кладём объект как отдельный элемент с уникальным ключом
        // используем уникальный ключ, чтобы не перезаписывать существующие
        const uniqueKey = `${id}::${Math.random().toString(36).slice(2)}`;
        map.set(uniqueKey, deepClone(item));
        continue;
      }

      // ключ для объединения — сам id
      const key = String(id);

      if (!map.has(key)) {
        map.set(key, deepClone(item));
        continue;
      }

      // если уже есть аккумулятор — объединяем
      const acc = map.get(key);
      for (const k of Object.keys(item)) {
        const val = item[k];
        // не трогаем regularEvent — оставляем как есть (можно адаптировать)
        if (k === 'regularEvent') {
          // если в аккумуляторе нет regularEvent, добавим
          if (acc[k] == null) acc[k] = deepClone(val);
          continue;
        }

        // если значение числовое либо строка, которую можно привести к числу — суммируем
        const numVal = Number(val);
        const isNumeric = val !== null && val !== '' && !Number.isNaN(numVal) && typeof val !== 'object';

        if (isNumeric) {
          acc[k] = (acc[k] != null ? Number(acc[k]) : 0) + numVal;
        } else {
          // для прочих типов: собираем уникальные значения в массив
          if (acc[k] == null) {
            acc[k] = val;
          } else {
            const arr = Array.isArray(acc[k]) ? acc[k] : [acc[k]];
            // добавляем только уникальные значения (с простым сравнением)
            if (!arr.includes(val)) arr.push(val);
            acc[k] = arr;
          }
        }
      }
    }

    return Array.from(map.values());
  } catch (error) {
    console.error('Ошибка в mergeByRegularEvent:', error);
    return items;
  }
}

const getStatusColor = (status) => {
  const colors = {
    'Спонсор': 'primary',
    'Генеральный партнер': 'success',
    'Стратегический партнер': 'info',
    'Участник': 'warning'
  };
  return colors[status] || 'secondary';
};

const formatNumber = (num) => {
  try {
    if(num > 0){
      return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(num);
    }
    return '0 ₽';
  } catch (error) {
    console.error('Ошибка в formatNumber:', error);
    return String(num || 0);
  }
}

// Данные для диаграмм
const userChartData = ref({ labels: [], datasets: [] })
const monthChartData = ref({ labels: [], datasets: [] })
const pieChartData = ref({ labels: [], datasets: [] })
const radarChartData = ref({ labels: [], datasets: [] })

// Опции для горизонтальных баров
const horizontalBarOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false // Скрываем легенду
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          let label = ctx.dataset.label || '';
          if (label) label += ': ';
          if (ctx.parsed.x !== null) {
            label += new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(ctx.parsed.x);
          }
          return label;
        }
      }
    },
    // Добавляем подписи данных
    datalabels: {
      display: true,
      color: 'white',
      font: {
        weight: 'bold',
        size: 12
      },
      formatter: (value) => {
        return new Intl.NumberFormat('ru-RU', { 
          style: 'currency', 
          currency: 'RUB',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      },
      align: 'center',
      offset: 0
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        callback: ''
      }
    },
    y: {
      ticks: {
        font: {
          size: 12
        }
      }
    }
  },

}

// Опции для круговой диаграммы
const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true // Показываем легенду
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const label = ctx.label || '';
          const value = ctx.raw || 0;
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value)} (${percentage}%)`;
        }
      }
    },
    // Настраиваем плагин datalabels для отображения белого текста суммы
    datalabels: {
      display: true, // Включаем отображение подписей
      color: 'white', // Белый цвет текста
      font: {
        weight: 'bold',
        size: 12
      },
      formatter: (value, context) => {
        // Форматируем сумму
        return new Intl.NumberFormat('ru-RU', { 
          style: 'currency', 
          currency: 'RUB',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      },
      // Размещаем подписи внутри сегментов
      anchor: 'center',
      align: 'center',
      offset: 0,
      // Добавляем текстовую тень для лучшей читаемости на светлых фонах
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
    }
  }
}

// Опции для лепестковой диаграммы
const radarChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => {
          let label = ctx.dataset.label || '';
          if (label) label += ': ';
          if (ctx.raw !== null) {
            label += new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(ctx.raw);
          }
          return label;
        }
      }
    }
  },
  scales: {
    r: {
      beginAtZero: true,
      ticks: {
        callback: (value) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', notation: 'compact' }).format(value)
      }
    }
  }
}

watch(
  () => filters.value.selected.events,
  (newVal) => {
    try {
      filters.value.selectAll.events = newVal.length === (filters.value.value.events || []).length;
    } catch (error) {
      console.error('Ошибка в watcher events:', error);
    }
  },
  { deep: true }
);

watch(
  () => filters.value.selected.companies,
  (newVal) => {
    try {
      filters.value.selectAll.companies = newVal.length === (filters.value.value.companies || []).length;
    } catch (error) {
      console.error('Ошибка в watcher companies:', error);
    }
  },
  { deep: true }
);
watch(
  () => filters.value.selected.users,
  (newVal) => {
    try {
      filters.value.selectAll.users = newVal.length === filteredUserOptions.value.length;
    } catch (error) {
      console.error('Ошибка в watcher users:', error);
    }
  },
  { deep: true }
);
// Следим за загрузкой новых сделок
watch(() => allDealsData.value, (newDeals) => {
  if (newDeals.length > 0) {
    // Если у нас есть выбранные пользователи, проверяем, есть ли они в новом списке
    const availableUserIds = new Set();
    newDeals.forEach(deal => {
      if (deal.ASSIGNED_BY_ID) {
        availableUserIds.add(String(deal.ASSIGNED_BY_ID));
      }
    });
    
    // Фильтруем выбранных пользователей, оставляя только тех, у кого есть сделки
    filters.value.selected.users = filters.value.selected.users.filter(userId => 
      availableUserIds.has(String(userId))
    );
  }
}, { deep: true });
</script>
<style lang="sass">

  #app
    margin: 0.75rem

  .v-data-table-footer
    justify-content: center

  .center
    display: flex
    align-items: center
    justify-content: center

  th, td
    border: 1px solid rgba(0, 0, 0, 0.12)

  .filters
    display: grid
    grid-template-columns: 1fr 1fr
    gap: 1rem
    margin-bottom: 1rem

  // НОВЫЙ СТИЛЬ: для фильтра по датам (обновленный)
  .date-range
    grid-column: span 2
    width: 100%
    
  .date-title
    display: flex
    justify-content: space-between
    align-items: center
    width: 100%
    padding: 0.5rem 1rem

  .v-dialog > .v-overlay__content > .v-card
    padding: 1em
    min-width: 700px

  .v-input.v-text-field
    display: block !important

  .v-input__details
    display: none

  .panel
    margin-bottom: 1rem

  .buttons
    width: 100%
    display: flex
    align-items: center
    justify-content: center
    gap: 1rem
    margin-bottom: 1rem

  .v-field__field
    max-height: 7rem
    overflow: hidden

  .filters .v-input__control
    height: 100%
  
  .v-table
    margin-bottom: 2rem

  th span
    font-weight: 600
    font-size: 1rem

  td:not(:first-child), th
    text-align: center !important

  .chats-input.v-input.v-text-field
    display: flex !important

  .chats-input .v-input__control
    flex-grow: 1
    
  .v-card-title.success.white--text
      background: #4cb050
      display: flex
      align-items: center
      justify-content: center
      padding: 0 1rem
      height: 4rem
      color: white
      font-size: 1.25rem

  .v-card-title.error.white--text
      background: #e30f0f
      display: flex
      align-items: center
      justify-content: center
      padding: 0 1rem
      height: 4rem
      color: white
      font-size: 1.25rem

  .successDialog .v-card-actions, .errorDialog .v-card-actions
      border-top: 1px solid #dddddd

  // Прогресс-бар загрузки (как в work-schedule)
  .loading-overlay
    z-index: 9999 !important
    position: fixed
    display: flex
    align-items: center
    justify-content: center
    width: 100vw
    height: 100vh
    top: 0
    left: 0

  .loading-card
    max-width: 400px
    border-radius: 16px
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1)

  .loading-progress
    max-width: 300px
    margin: 0 auto

  .v-data-table-header__content
    align-items: center
    justify-content: center

  .v-data-table-footer__items-per-page  .v-field__field
    overflow: visible

  .v-data-table__th 
    background: #676767
    color: white
    
  tbody .v-data-table__tr:nth-child(even)
    background-color: white

  tbody .v-data-table__tr:nth-child(odd)
    background-color: #dddddd

  // Стили для ряда с диаграммами
  .charts-row
    display: flex
    gap: 1.5rem
    margin-bottom: 1.5rem
    flex-wrap: wrap

  .chart-container
    flex: 1 1 45%
    min-width: 300px
    height: 267px

  // Стиль для блока с общей суммой
  .total-sum-container
    display: flex
    justify-content: center
    align-items: center
    margin-bottom: 2rem
    padding: 1rem
    background-color: #f5f5f5
    border-radius: 4px
    
    h4
      margin: 0
      font-size: 1.2rem
      
    .total-sum
      font-size: 1.4rem
      font-weight: bold
      color: #1976D2
      margin-left: 0.5rem

  // Стили для таблицы всех сделок
  .deals-table
    margin-top: 1rem
    
  .search-field
    max-width: 300px
    
  .bg-primary
    background-color: #1976D2 !important
    
  .text-white
    color: white !important
    
  .mt-6
    margin-top: 1.5rem

  a
    color: black

  .chart-header
    text-align: center

</style>
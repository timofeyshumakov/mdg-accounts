<template>
  <!-- Заглушка «в разработке» — раскомментировать при необходимости
  <section class="monthly-report-stub">
    <img
      class="monthly-report-stub__image"
      :src="underConstructionSrc"
      alt="Извините, страница в разработке. Зайдите, пожалуйста, позже."
    >
  </section>
  -->

  <section class="monthly-report">
    <LoadingProgress
      :visible="isLoading"
      :message="loadingMessage"
      :model-value="loadingProgress"
      :auto-hide="false"
    />

    <template v-if="!isLoading">
      <section class="monthly-stats">
        <button
          type="button"
          class="monthly-stats__card--total"
          :class="{ 'monthly-stats__card--active': attentionFilter === 'all' }"
          @click="attentionFilter = 'all'"
        >
          <span class="monthly-stats__icon monthly-stats__icon--total">
            <img :src="partnersIcon" alt="Всего партнеров" class="monthly-stats__icon-img">
          </span>
          <div class="monthly-stats__body">
            <span class="monthly-stats__label">Всего партнеров</span>
            <strong class="monthly-stats__value">{{ stats.total }}</strong>
          </div>
        </button>

        <button
          type="button"
          class="monthly-stats__card--report"
          :class="{ 'monthly-stats__card--active': attentionFilter === 'no-report' }"
          @click="toggleAttentionFilter('no-report')"
        >
          <span class="monthly-stats__icon monthly-stats__icon--report">
            <img :src="noReportsIcon" alt="Нет отчета" class="monthly-stats__icon-img">
          </span>
          <div class="monthly-stats__body">
            <span class="monthly-stats__label">Нет отчета</span>
            <strong class="monthly-stats__value monthly-stats__value--report">{{ stats.noReport }}</strong>
            <span class="monthly-stats__badge monthly-stats__badge--report">Требует внимания</span>
          </div>
        </button>

        <button
          type="button"
          class="monthly-stats__card--warning"
          :class="{ 'monthly-stats__card--active': attentionFilter === 'no-touches' }"
          @click="toggleAttentionFilter('no-touches')"
        >
          <span class="monthly-stats__icon monthly-stats__icon--warning">
            <img :src="noTouchesIcon" alt="Нет касаний" class="monthly-stats__icon-img">
          </span>
          <div class="monthly-stats__body">
            <span class="monthly-stats__label">Нет касаний</span>
            <strong class="monthly-stats__value monthly-stats__value--warning">{{ stats.noTouches }}</strong>
            <span class="monthly-stats__badge monthly-stats__badge--warning">Требует внимания</span>
          </div>
        </button>
      </section>

      <article class="monthly-report__filters panel">
        <h3 class="monthly-report__title">Фильтры</h3>

        <div class="monthly-report__primary">
          <div class="monthly-report__field">
            <span class="monthly-report__label">Сотрудник</span>
            <v-autocomplete
              v-model="selectedAssigned"
              :items="assignedOptions"
              item-title="title"
              item-value="id"
              placeholder="Все сотрудники"
              density="compact"
              variant="outlined"
              hide-details
              multiple
              chips
              clearable
              prepend-inner-icon="$accountOutline"
            >
              <template #prepend-item>
                <v-list-item>
                  <v-checkbox
                    :model-value="isAllSelected(selectedAssigned, assignedOptions)"
                    label="Выбрать всех"
                    hide-details
                    density="compact"
                    :disabled="!assignedOptions.length"
                    @update:model-value="toggleAllAssigned($event)"
                  />
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>
          <div class="monthly-report__field">
            <span class="monthly-report__label">Месяц</span>
            <v-autocomplete
              v-model="selectedMonths"
              :items="monthOptions"
              item-title="title"
              item-value="id"
              placeholder="Все месяцы"
              density="compact"
              variant="outlined"
              hide-details
              multiple
              chips
              clearable
              prepend-inner-icon="$calendarMonthOutline"
            >
              <template #prepend-item>
                <v-list-item>
                  <v-checkbox
                    :model-value="isAllSelected(selectedMonths, monthOptions)"
                    label="Выбрать все"
                    hide-details
                    density="compact"
                    @update:model-value="toggleAllMonths($event)"
                  />
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>
          <div class="monthly-report__field">
            <span class="monthly-report__label">Год</span>
            <v-autocomplete
              v-model="selectedYears"
              :items="yearOptions"
              item-title="title"
              item-value="id"
              placeholder="Все годы"
              density="compact"
              variant="outlined"
              hide-details
              multiple
              chips
              clearable
              prepend-inner-icon="$calendarOutline"
            >
              <template #prepend-item>
                <v-list-item>
                  <v-checkbox
                    :model-value="isAllSelected(selectedYears, yearOptions)"
                    label="Выбрать все"
                    hide-details
                    density="compact"
                    :disabled="!yearOptions.length"
                    @update:model-value="toggleAllYears($event)"
                  />
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>
        </div>

        <nav class="monthly-tabs">
          <button
            v-for="tab in monthlyTabs"
            :key="tab.id"
            type="button"
            class="monthly-tabs__tab"
            :class="{ 'monthly-tabs__tab--active': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.title }}
            <span v-if="tab.count != null" class="monthly-tabs__count">{{ tab.count }}</span>
          </button>
        </nav>

        <div v-if="activeTab === 'actual' || activeTab === 'new'" class="monthly-report__search-row">
          <v-text-field
            v-model="search"
            placeholder="Поиск по ФИО, организации"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            prepend-inner-icon="$magnify"
          />
        </div>
      </article>

      <MonthlySummaryTab
        v-if="activeTab === 'summary'"
        :period="reportPeriod"
        :assigned-ids="selectedAssigned"
      />

      <MonthlySpTab
        v-else-if="activeTab === 'plan'"
        title="План по контактам"
        hint="Планы по привлечению и развитию контактов из смарт-процесса «План по контактам»."
        create-label="Создать план"
        :create-path="MONTHLY_PLAN_CREATE_PATH"
        loading-label="Загрузка плана…"
        empty-label="План по контактам пуст."
        :columns="planColumns"
        :loader="loadMonthlyPlans"
        :details-path="buildMonthlyPlanDetailsPath"
        :assigned-ids="selectedAssigned"
        :months="selectedMonths"
      />

      <MonthlySpTab
        v-else-if="activeTab === 'pains'"
        title="Боли и предложения по улучшению"
        create-label="Создать запись"
        :create-path="MONTHLY_PAINS_CREATE_PATH"
        loading-label="Загрузка болей и предложений…"
        empty-label="Записей пока нет."
        :columns="painColumns"
        :loader="loadMonthlyPains"
        :details-path="buildMonthlyPainsDetailsPath"
        :assigned-ids="selectedAssigned"
      />

      <MonthlyEventsTab
        v-else-if="activeTab === 'our-events'"
        title="Наши мероприятия"
        empty-label="Нет мероприятий за выбранный месяц."
        :columns="ourEventColumns"
        :period="reportPeriod"
        :details-path="buildOurEventDetailsPath"
        :loader="loadOurEventsForTable"
        :assigned-ids="selectedAssigned"
      />

      <MonthlyEventsTab
        v-else-if="activeTab === 'competitor-events'"
        title="Мероприятия конкурентов"
        empty-label="Нет мероприятий конкурентов за выбранный месяц."
        :columns="competitorEventColumns"
        :period="reportPeriod"
        :details-path="buildCompetitorEventDetailsPath"
        :loader="loadCompetitorEventsForTable"
        :assigned-ids="selectedAssigned"
      />

      <template v-else>
      <section v-if="activeTab === 'actual'" class="report-table-section">
        <v-card class="report-table-card report-table-card--sticky panel monthly-report-table-card">
          <v-card-title class="report-table-title">
            Актуальные партнеры
            <span class="monthly-report__table-count">{{ actualFilteredRows.length }}</span>
          </v-card-title>

          <div class="monthly-table-chips">
            <div class="monthly-filter-card__chips">
              <v-autocomplete
                v-model="selectedRelationStatuses"
                :items="actualRelationStatusChips"
                item-title="label"
                item-value="id"
                label="Статус отношений"
                placeholder="Все статусы отношений"
                density="compact"
                variant="outlined"
                hide-details
                multiple
                chips
                clearable
                class="monthly-table-chips__autocomplete"
              >
                <template #prepend-item>
                  <v-list-item>
                    <v-checkbox
                      :model-value="isAllSelected(selectedRelationStatuses, actualRelationStatusChips)"
                      label="Выбрать все"
                      hide-details
                      density="compact"
                      :disabled="!actualRelationStatusChips.length"
                      @update:model-value="toggleAllRelationStatuses($event)"
                    />
                  </v-list-item>
                </template>
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #append>
                      <span class="monthly-chip__count">{{ item.raw.count }}</span>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </div>
            <div class="monthly-filter-card__chips">
              <v-autocomplete
                v-model="selectedCurrentStatuses"
                :items="actualCurrentStatusChips"
                item-title="label"
                item-value="id"
                label="Текущий статус"
                placeholder="Все текущие статусы"
                density="compact"
                variant="outlined"
                hide-details
                multiple
                chips
                clearable
                class="monthly-table-chips__autocomplete"
              >
                <template #prepend-item>
                  <v-list-item>
                    <v-checkbox
                      :model-value="isAllSelected(selectedCurrentStatuses, actualCurrentStatusChips)"
                      label="Выбрать все"
                      hide-details
                      density="compact"
                      :disabled="!actualCurrentStatusChips.length"
                      @update:model-value="toggleAllCurrentStatuses($event)"
                    />
                  </v-list-item>
                </template>
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #append>
                      <span class="monthly-chip__count">{{ item.raw.count }}</span>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </div>
          </div>

          <v-data-table
            :headers="actualHeaders"
            :items="actualFilteredRows"
            item-value="id"
            density="comfortable"
            hover
            class="report-data-table report-data-table--paginated activity-report-table sticky-report-table monthly-report-table"
            :items-per-page="20"
            :row-props="getRowProps"
          >
            <template #header.calls="{ column }">
              <span class="table-header__icon">
                <v-icon icon="$phone" size="16" />
                {{ column.title }}
              </span>
            </template>
            <template #header.meetings="{ column }">
              <span class="table-header__icon">
                <v-icon icon="$calendar" size="16" />
                {{ column.title }}
              </span>
            </template>
            <template #item.partner="{ item }">
              <div class="event-cell">
                <div class="event-cell__title-row">
                  <button
                    type="button"
                    class="monthly-table__partner-name event-link"
                    @click="openContact(item.id)"
                  >
                    {{ item.partnerName }}
                    <!-- <template v-if="item.organization">, {{ item.organization }}</template> -->
                  </button>
                </div>
                <button
                  type="button"
                  class="event-link event-link--secondary"
                  @click="openReports(item)"
                >
                  Все отчёты
                </button>
              </div>
            </template>

            <template #item.assigned="{ item }">
              <div v-if="getAssignedDisplay(item)" class="responsible-cell">
                <v-avatar size="28" color="primary" variant="tonal">
                  <img
                    v-if="getAssignedPhoto(item)"
                    :src="getAssignedPhoto(item)"
                    :alt="getAssignedDisplay(item)?.shortName"
                    class="avatar-image"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="markAvatarFailed(getAssignedPhoto(item))"
                  >
                  <span v-else class="avatar-initials">
                    {{ getUserInitials(getAssignedDisplay(item)?.shortName || '') }}
                  </span>
                </v-avatar>
                <span
                  class="responsible-name"
                  :title="getAssignedDisplay(item)?.name"
                >
                  {{ getAssignedDisplay(item)?.shortName }}
                </span>
              </div>
              <span v-else class="monthly-table__text monthly-table__text--empty">—</span>
            </template>

            <template #item.nosologies="{ item }">
              <button
                type="button"
                class="monthly-table__text"
                :class="{ 'monthly-table__text--empty': !item.nosologies }"
                @click="openFieldEditor(item, 'nosologies')"
              >
                {{ item.nosologies || '—' }}
              </button>
            </template>

            <template #item.relationStatus="{ item }">
              <div class="monthly-table__edit" @click.stop>
                <v-autocomplete
                  :model-value="item.relationStatusId || null"
                  :items="relationStatusOptions"
                  item-title="title"
                  item-value="id"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  placeholder="Статус отношений"
                  class="monthly-table__input status-participation-select"
                  :menu-props="{ maxHeight: 280 }"
                  @update:model-value="onRelationStatusChange(item, $event)"
                />
              </div>
            </template>

            <template #item.interest="{ item }">
              <v-textarea
                v-model="item.interest"
                density="compact"
                variant="outlined"
                hide-details
                rows="2"
                auto-grow
                placeholder="Чем интересен"
                class="monthly-table__input"
                @click.stop
                @blur="onInterestBlur(item)"
              />
            </template>

            <template #item.agreementLink="{ item }">
              <div v-if="item.agreementInfo" class="agreement-info">
                <div class="agreement-info__item">
                  <span class="agreement-info__label">Дата создания</span>
                  <span class="agreement-info__value">{{ item.agreementInfo.created }}</span>
                </div>
                <div v-if="item.agreementInfo.source" class="agreement-info__item">
                  <span class="agreement-info__label">Источник контакта</span>
                  <span class="agreement-info__value">{{ item.agreementInfo.source }}</span>
                </div>
                <div v-if="item.agreementInfo.interest" class="agreement-info__item">
                  <span class="agreement-info__label">Почему интересен</span>
                  <span class="agreement-info__value">{{ item.agreementInfo.interest }}</span>
                </div>
                <div v-if="item.agreementInfo.currentStatus" class="agreement-info__item">
                  <span class="agreement-info__label">Текущий статус</span>
                  <span class="agreement-info__value">{{ item.agreementInfo.currentStatus }}</span>
                </div>
              </div>
              <div v-else class="agreement-info__empty">
                Нет договоренности
              </div>
            </template>

            <template #item.ourEventsLink="{ item }">
              <div v-if="item.events && item.events.length" class="events-list">
                <button
                  v-for="event in item.events"
                  :key="event.id"
                  type="button"
                  class="events-list__item"
                  @click="openEventDetails(event.id)"
                >
                  <span class="events-list__bullet">•</span>
                  <span class="events-list__title">{{ event.title }}</span>
                </button>
              </div>
              <div v-else class="events-list__empty">
                Нет мероприятий
              </div>
            </template>

            <template #item.calls="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'calls')"
              >
                <strong>{{ touchCount(item, 'calls') }}</strong>
              </button>
            </template>

            <template #item.emails="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'emails')"
              >
                <strong>{{ touchCount(item, 'emails') }}</strong>
              </button>
            </template>

            <template #item.meetings="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'meetings')"
              >
                <strong>{{ touchCount(item, 'meetings') }}</strong>
              </button>
            </template>

            <template #item.currentStatus="{ item }">
              <div class="monthly-table__edit" @click.stop>
                <v-autocomplete
                  :model-value="item.currentStatusId || null"
                  :items="currentStatusOptions"
                  item-title="title"
                  item-value="id"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  placeholder="Текущий статус"
                  class="monthly-table__input status-participation-select"
                  :menu-props="{ maxHeight: 280 }"
                  @update:model-value="onCurrentStatusChange(item, $event)"
                />
              </div>
            </template>

            <template #item.comment="{ item }">
              <v-textarea
                v-model="item.comment"
                density="compact"
                variant="outlined"
                hide-details
                rows="2"
                auto-grow
                class="monthly-table__input"
                @click.stop
              />
            </template>

            <template #item.nextStep="{ item }">
              <v-textarea
                v-model="item.nextStep"
                density="compact"
                variant="outlined"
                hide-details
                rows="2"
                auto-grow
                class="monthly-table__input"
                @click.stop
              />
            </template>

            <template #item.tasks="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTasksDialog(item)"
              >
                <span class="task-count-badge">{{ item.tasks }}</span>
              </button>
            </template>

            <template #item.actions="{ item }">
              <div class="event-actions">
                <v-btn
                  color="green"
                  size="small"
                  variant="flat"
                  class="monthly-table__send"
                  :loading="sendingRowId === item.id"
                  :disabled="Boolean(sendingRowId)"
                  @click="submitRow(item)"
                >
                  Отправить
                  <template #append>
                    <v-icon icon="$send" size="16" />
                  </template>
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </section>

      <section v-if="activeTab === 'new'" class="report-table-section">
        <v-card class="report-table-card report-table-card--sticky panel monthly-report-table-card">
          <v-card-title class="report-table-title">
            Новые партнеры
            <span class="monthly-report__table-count">{{ newFilteredRows.length }}</span>
          </v-card-title>

          <div class="monthly-table-chips">
            <div class="monthly-filter-card__chips">
              <v-autocomplete
                v-model="selectedNewCurrentStatuses"
                :items="newCurrentStatusChips"
                item-title="label"
                item-value="id"
                label="Текущий статус"
                placeholder="Все текущие статусы"
                density="compact"
                variant="outlined"
                hide-details
                multiple
                chips
                clearable
                class="monthly-table-chips__autocomplete"
              >
                <template #prepend-item>
                  <v-list-item>
                    <v-checkbox
                      :model-value="isAllSelected(selectedNewCurrentStatuses, newCurrentStatusChips)"
                      label="Выбрать все"
                      hide-details
                      density="compact"
                      :disabled="!newCurrentStatusChips.length"
                      @update:model-value="toggleAllNewCurrentStatuses($event)"
                    />
                  </v-list-item>
                </template>
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #append>
                      <span class="monthly-chip__count">{{ item.raw.count }}</span>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </div>
          </div>

          <v-data-table
            :headers="newHeaders"
            :items="newFilteredRows"
            item-value="id"
            density="comfortable"
            hover
            class="report-data-table report-data-table--paginated activity-report-table sticky-report-table monthly-report-table"
            :items-per-page="25"
            :row-props="getRowProps"
          >
            <template #header.calls="{ column }">
              <span class="table-header__icon">
                <v-icon icon="$phone" size="16" />
                {{ column.title }}
              </span>
            </template>
            <template #header.meetings="{ column }">
              <span class="table-header__icon">
                <v-icon icon="$calendar" size="16" />
                {{ column.title }}
              </span>
            </template>

            <template #item.partner="{ item }">
              <div class="event-cell">
                <div class="event-cell__title-row">
                  <button
                    type="button"
                    class="monthly-table__partner-name event-link"
                    @click="openContact(item.id)"
                  >
                    {{ item.partnerName }}
                    <!-- <template v-if="item.organization">, {{ item.organization }}</template> -->
                  </button>
                </div>
                <button
                  type="button"
                  class="event-link event-link--secondary"
                  @click="openReports(item)"
                >
                  Все отчёты
                </button>
              </div>
            </template>

            <template #item.assigned="{ item }">
              <div v-if="getAssignedDisplay(item)" class="responsible-cell">
                <v-avatar size="28" color="primary" variant="tonal">
                  <img
                    v-if="getAssignedPhoto(item)"
                    :src="getAssignedPhoto(item)"
                    :alt="getAssignedDisplay(item)?.shortName"
                    class="avatar-image"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="markAvatarFailed(getAssignedPhoto(item))"
                  >
                  <span v-else class="avatar-initials">
                    {{ getUserInitials(getAssignedDisplay(item)?.shortName || '') }}
                  </span>
                </v-avatar>
                <span
                  class="responsible-name"
                  :title="getAssignedDisplay(item)?.name"
                >
                  {{ getAssignedDisplay(item)?.shortName }}
                </span>
              </div>
              <span v-else class="monthly-table__text monthly-table__text--empty">—</span>
            </template>

            <template #item.nosologies="{ item }">
              <button
                type="button"
                class="monthly-table__text"
                :class="{ 'monthly-table__text--empty': !item.nosologies }"
                @click="openFieldEditor(item, 'nosologies')"
              >
                {{ item.nosologies || '—' }}
              </button>
            </template>

            <template #item.agreementLink="{ item }">
              <button
                v-if="item.agreementInfo"
                type="button"
                class="agreement-cell"
                @click="openAgreement(item.agreementInfo.id)"
              >
                <div class="agreement-cell__item" v-if="item.agreementInfo.createdTime">
                  <span class="agreement-cell__text">Дата создания: {{ item.agreementInfo.createdTime }}</span>
                </div>
                <div class="agreement-cell__item" v-if="item.agreementInfo.source">
                  <span class="agreement-cell__text">Источник: {{ item.agreementInfo.source }}</span>
                </div>
                <div class="agreement-cell__item" v-if="item.agreementInfo.interest">
                  <span class="agreement-cell__text">Почему интересен: {{ item.agreementInfo.interest }}</span>
                </div>
                <div class="agreement-cell__item" v-if="item.agreementInfo.currentStatus">
                  <span class="agreement-cell__text">Текущий статус: {{ item.agreementInfo.currentStatus }}</span>
                </div>
              </button>
              <div v-else class="agreement-info__empty">
                Нет договоренности
              </div>
            </template>

            <template #item.calls="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'calls')"
              >
                <strong>{{ touchCount(item, 'calls') }}</strong>
              </button>
            </template>

            <template #item.emails="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'emails')"
              >
                <strong>{{ touchCount(item, 'emails') }}</strong>
              </button>
            </template>

            <template #item.meetings="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTouchesDialog(item, 'meetings')"
              >
                <strong>{{ touchCount(item, 'meetings') }}</strong>
              </button>
            </template>

            <template #item.currentStatus="{ item }">
              <div class="monthly-table__edit" @click.stop>
                <v-autocomplete
                  :model-value="item.currentStatusId || null"
                  :items="currentStatusOptions"
                  item-title="title"
                  item-value="id"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  placeholder="Текущий статус"
                  class="monthly-table__input status-participation-select"
                  :menu-props="{ maxHeight: 280 }"
                  @update:model-value="onCurrentStatusChange(item, $event)"
                />
              </div>
            </template>

            <template #item.comment="{ item }">
              <v-textarea
                v-model="item.comment"
                density="compact"
                variant="outlined"
                hide-details
                rows="2"
                auto-grow
                class="monthly-table__input"
                @click.stop
              />
            </template>

            <template #item.nextStep="{ item }">
              <v-textarea
                v-model="item.nextStep"
                density="compact"
                variant="outlined"
                hide-details
                rows="2"
                auto-grow
                class="monthly-table__input"
                @click.stop
              />
            </template>

            <template #item.tasks="{ item }">
              <button
                type="button"
                class="monthly-touch-cell"
                @click="openTasksDialog(item)"
              >
                <span class="task-count-badge">{{ item.tasks }}</span>
              </button>
            </template>

            <template #item.actions="{ item }">
              <div class="event-actions">
                <v-btn
                  color="green"
                  size="small"
                  variant="flat"
                  class="monthly-table__send"
                  :loading="sendingRowId === item.id"
                  :disabled="Boolean(sendingRowId)"
                  @click="submitRow(item)"
                >
                  Отправить
                  <template #append>
                    <v-icon icon="$send" size="16" />
                  </template>
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </section>
      </template>

      <MonthlyTouchesDialog
        v-model="touchesDialogOpen"
        :partner-name="touchesDialogPartner"
        :contact-id="touchesDialogContactId"
        :touches="touchesDialogItems"
        :kind="touchesDialogKind"
        :months="touchesPeriod.months"
        :years="touchesPeriod.years"
        @open-touch="openTouchItem"
        @create-touch="createTouchFromDialog"
      />

      <MonthlyTouchCreateDialog
        v-model="touchCreateOpen"
        :contact-id="touchesDialogContactId"
        :partner-name="touchesDialogPartner"
        :default-kind="touchesDialogKind"
        @created="onTouchCreated"
      />

      <MonthlyTasksDialog
        v-model="tasksDialogOpen"
        :partner-name="tasksDialogPartner"
        :tasks="tasksDialogItems"
        @open-task="openTaskItem"
      />

      <MonthlyFieldEditDialog
        v-model="fieldEditorOpen"
        :title="fieldEditorTitle"
        :partner-name="fieldEditorPartner"
        :placeholder="fieldEditorPlaceholder"
        :options="fieldEditorOptions"
        multiple
        :model-ids="fieldEditorIds"
        start-editing
        :saving="savingCell"
        @save="onFieldEditorSave"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, type Ref, watch } from 'vue';
import LoadingProgress from '../../../components/LoadingProgress.vue';
import type { FilterOption } from '../functions/crmFilters';
import { runWhenBx24Ready } from '../functions/bitrixReady';
import { openBitrixPath, openBitrixPathInNewWindow, buildContactDetailsPath } from '../functions/bitrixPath';
import { loadMonthlyReportData, resolvePartnerTypeId } from '../functions/monthlyReport';
import {
  buildMonthlyReportSpaDetailsPath,
  buildMonthlyReportSpaListPath,
  createMonthlyReportSpaItem,
  loadContactIdsWithReportForPeriod,
  resolveReportPeriod,
} from '../functions/monthlyReportSubmit';
import {
  buildTouchDetailsPath,
  countTouchesByKind,
  loadTouchesByContactIds,
  resolveTouchesPeriod,
} from '../functions/monthlyTouches';
import {
  getUserInitials,
  loadUserDisplaysByIds,
  type UserDisplay,
} from '../functions/userDisplay';
import {
  updateContactCurrentStatus,
  updateContactInterest,
  updateContactNosologies,
  updateContactRelationStatus,
} from '../functions/monthlyContactEdit';
import {
  buildTaskDetailsPath,
  type MonthlyTaskItem,
} from '../functions/monthlyTasks';
import MonthlyTouchesDialog from './MonthlyTouchesDialog.vue';
import MonthlyTouchCreateDialog from './MonthlyTouchCreateDialog.vue';
import MonthlyTasksDialog from './MonthlyTasksDialog.vue';
import MonthlyFieldEditDialog from './MonthlyFieldEditDialog.vue';
import MonthlySummaryTab from './MonthlySummaryTab.vue';
import MonthlySpTab from './MonthlySpTab.vue';
import type { SpColumn } from './MonthlySpTab.vue';
import MonthlyEventsTab from './MonthlyEventsTab.vue';
import type { EventColumn } from './MonthlyEventsTab.vue';
import {
  buildMonthlyPainsDetailsPath,
  buildMonthlyPlanDetailsPath,
  loadMonthlyPains,
  loadMonthlyPlans,
  MONTHLY_PAINS_CREATE_PATH,
  MONTHLY_PLAN_CREATE_PATH,
} from '../functions/monthlySummary';
import {
  buildCompetitorEventDetailsPath,
  buildOurEventDetailsPath,
  loadCompetitorEventsForTable,
  loadOurEventsForTable,
} from '../functions/monthlyEvents';
import {
  filterMonthlyReportRows,
  filterMonthlyReportRowsForChipCounts,
  hasNextStep,
  hasTouchesInPeriod,
  monthlyMonthOptions,
  monthlyYearOptions,
  recountChips,
  type MonthlyChipOption,
  type MonthlyReportRow,
  type MonthlyTouchItem,
  type TouchKind,
} from '../mock/monthlyReportData';
import { useStickyReportTableHeaders } from '../../../composables/useStickyReportTableHeaders';
import partnersIcon from '../assets/icons/partners.png';
import noReportsIcon from '../assets/icons/no-reports.png';
import noTouchesIcon from '../assets/icons/no-touches.png';
// import underConstructionSrc from '../assets/under-construction.png';

const {
  mountStickyReportTableHeaders,
  refreshStickyReportTableHeaders,
  unmountStickyReportTableHeaders,
} = useStickyReportTableHeaders();

const props = defineProps<{
  assignedOptions: FilterOption[];
}>();

const isLoading = ref(true);
const loadingProgress = ref(0);
const loadingMessage = ref('Загрузка партнёров…');
const rows = ref<MonthlyReportRow[]>([]);
const relationStatusChipDefs = ref<MonthlyChipOption[]>([]);
const relationStatusOptions = ref<Array<{ id: string; title: string }>>([]);
const currentStatusChipDefs = ref<MonthlyChipOption[]>([]);
const newCurrentStatusOptions = ref<Array<{ id: string; title: string }>>([]);
const nosologyOptions = ref<Array<{ id: string; title: string }>>([]);

const search = ref('');
const selectedAssigned = ref<string[]>([]);
const selectedMonths = ref<number[]>([]);
const selectedYears = ref<string[]>([]);
const selectedRelationStatuses = ref<string[]>([]);
const selectedCurrentStatuses = ref<string[]>([]);
const selectedNewCurrentStatuses = ref<string[]>([]);

const touchesDialogOpen = ref(false);
const touchesDialogPartner = ref('');
const touchesDialogContactId = ref('');
const touchesDialogItems = ref<MonthlyTouchItem[]>([]);
const touchesDialogKind = ref<TouchKind | null>(null);
const touchCreateOpen = ref(false);
const tasksDialogOpen = ref(false);
const tasksDialogPartner = ref('');
const tasksDialogItems = ref<MonthlyTaskItem[]>([]);
const sendingRowId = ref<string | null>(null);
const submitError = ref('');
const attentionFilter = ref<'all' | 'no-touches' | 'no-next-step' | 'no-report'>('all');
const activeTab = ref<MonthlyTabId>('actual');
const contactIdsWithReport = ref<Set<string>>(new Set());
const userDisplaysById = ref<Map<string, UserDisplay>>(new Map());
const failedAvatars = ref<Set<string>>(new Set());

const savingCell = ref(false);

type MonthlyTabId =
  | 'summary'
  | 'plan'
  | 'pains'
  | 'our-events'
  | 'competitor-events'
  | 'actual'
  | 'new';

type FieldEditorKind = 'nosologies';

const fieldEditorOpen = ref(false);
const fieldEditorKind = ref<FieldEditorKind>('nosologies');
const fieldEditorRow = ref<MonthlyReportRow | null>(null);
const fieldEditorPartner = ref('');
const fieldEditorIds = ref<string[]>([]);

const monthOptions = monthlyMonthOptions;
const yearOptions = monthlyYearOptions;

const actualHeaders = [
  { title: 'Партнер', key: 'partner', align: 'start' as const, sortable: false },
  { title: 'Ответственный', key: 'assigned', align: 'start' as const, sortable: false },
  { title: 'Статус отношений', key: 'relationStatus', align: 'center' as const, sortable: false, width: 180 },
  { title: 'Нозологии', key: 'nosologies', align: 'center' as const, sortable: false, width: '12%' },
  { title: 'Мероприятия', key: 'ourEventsLink', align: 'center' as const, sortable: false },
  {
    title: 'Касаний за месяц',
    key: 'touches',
    align: 'center' as const,
    sortable: false,
    children: [
      { title: 'Звонки', key: 'calls', align: 'center' as const, sortable: false },
      { title: 'Встречи', key: 'meetings', align: 'center' as const, sortable: false },
    ],
  },
  { title: 'Текущий статус', key: 'currentStatus', align: 'center' as const, sortable: false, width: 180 },
  { title: 'Комментарий', key: 'comment', align: 'start' as const, sortable: false },
  { title: 'Следующий шаг', key: 'nextStep', align: 'start' as const, sortable: false },
  { title: 'Задачи', key: 'tasks', align: 'center' as const, sortable: false },
  { title: 'Действия', key: 'actions', align: 'center' as const, sortable: false },
];

const newHeaders = [
  { title: 'Партнер', key: 'partner', align: 'start' as const, sortable: false },
  { title: 'Ответственный', key: 'assigned', align: 'start' as const, sortable: false },
  { title: 'Нозологии', key: 'nosologies', align: 'center' as const, sortable: false },
  { title: 'Формирование договоренности', key: 'agreementLink', align: 'center' as const, sortable: false },
  {
    title: 'Касаний за месяц',
    key: 'touches',
    align: 'center' as const,
    sortable: false,
    children: [
      { title: 'Звонки', key: 'calls', align: 'center' as const, sortable: false },
      { title: 'Встречи', key: 'meetings', align: 'center' as const, sortable: false },
    ],
  },
  { title: 'Комментарий', key: 'comment', align: 'start' as const, sortable: false },
  { title: 'Следующий шаг', key: 'nextStep', align: 'start' as const, sortable: false },
  { title: 'Задачи', key: 'tasks', align: 'center' as const, sortable: false },
  { title: 'Действия', key: 'actions', align: 'center' as const, sortable: false },
];

/** Колонки таблицы «План по контактам». */
const planColumns: SpColumn[] = [
  { key: 'assignedName', title: 'Ответственный' },
  { key: 'month', title: 'Месяц', align: 'center' },
  { key: 'direction', title: 'Направление / контакт', wrap: true },
  { key: 'goal', title: 'Цель', wrap: true },
  { key: 'currentStatus', title: 'Текущий статус', wrap: true },
  { key: 'nextStep', title: 'Следующий шаг', wrap: true },
  { key: 'priority', title: 'Приоритет', align: 'center' },
  { key: 'created', title: 'Дата создания', align: 'center' },
];

/** Колонки таблицы «Боли и предложения». */
const painColumns: SpColumn[] = [
  // Ответственный — на 25% уже прочих колонок (160px вместо ~215px).
  { key: 'assignedName', title: 'Ответственный', width: 160 },
  { key: 'created', title: 'Когда создан', align: 'center' },
  { key: 'problem', title: 'Боль / проблема' },
  { key: 'impact', title: 'Как влияет на работу' },
  { key: 'suggestion', title: 'Что предлагаю улучшить' },
];

/** Колонки таблицы «Наши мероприятия». */
const ourEventColumns: EventColumn[] = [
  { key: 'startDate', title: 'Дата начала', align: 'center' },
  { key: 'endDate', title: 'Дата завершения', align: 'center' },
  { key: 'assigned', title: 'Ответственный' },
  { key: 'type', title: 'Тип', wrap: true },
  { key: 'city', title: 'Город', wrap: true },
  { key: 'client', title: 'Клиент', wrap: true },
  { key: 'audience', title: 'Целевая аудитория', wrap: true },
  { key: 'stage', title: 'Стадия', wrap: true },
];

/** Колонки таблицы «Мероприятия конкурентов». */
const competitorEventColumns: EventColumn[] = [
  { key: 'company', title: 'Компания' },
  { key: 'assigned', title: 'Ответственный' },
  { key: 'type', title: 'Тип мероприятия', wrap: true },
  { key: 'nosology', title: 'Нозология', wrap: true },
  { key: 'city', title: 'Город', wrap: true },
  { key: 'startDate', title: 'Дата начала', align: 'center' },
  { key: 'endDate', title: 'Дата завершения', align: 'center' },
];

const listFilterParams = computed(() => ({
  search: search.value,
  assignedIds: selectedAssigned.value,
  months: selectedMonths.value,
  years: selectedYears.value,
  partnerTypes: [] as string[],
  relationStatuses: selectedRelationStatuses.value,
  currentStatuses: selectedCurrentStatuses.value,
  newCurrentStatuses: selectedNewCurrentStatuses.value,
}));

const baseFilteredRows = computed(() => filterMonthlyReportRows(rows.value, listFilterParams.value));

const touchesPeriod = computed(() =>
  resolveTouchesPeriod(selectedMonths.value, selectedYears.value),
);

/** Фильтр «требует внимания» — применяется к обеим таблицам. */
const attentionFilteredRows = computed(() => {
  const filter = attentionFilter.value;
  if (filter === 'all') {
    return baseFilteredRows.value;
  }

  const { months, years } = touchesPeriod.value;
  return baseFilteredRows.value.filter((row) => {
    if (filter === 'no-touches') {
      return !hasTouchesInPeriod(row, months, years);
    }
    if (filter === 'no-next-step') {
      return !hasNextStep(row);
    }
    return !contactIdsWithReport.value.has(String(row.id));
  });
});

const actualFilteredRows = computed(() =>
  attentionFilteredRows.value.filter((row) => row.partnerTypeId === 'active'),
);

const newFilteredRows = computed(() =>
  attentionFilteredRows.value.filter((row) => row.partnerTypeId === 'new'),
);

const reportPeriod = computed(() =>
  resolveReportPeriod(selectedMonths.value, selectedYears.value),
);

const stats = computed(() => {
  const list = baseFilteredRows.value;
  const { months, years } = touchesPeriod.value;
  return {
    total: list.length,
    noTouches: list.filter((row) => !hasTouchesInPeriod(row, months, years)).length,
    noNextStep: list.filter((row) => !hasNextStep(row)).length,
    noReport: list.filter((row) => !contactIdsWithReport.value.has(String(row.id))).length,
  };
});

const monthlyTabs = computed<Array<{ id: MonthlyTabId; title: string; count?: number }>>(() => [
  { id: 'summary', title: 'Резюме месяца' },
  { id: 'plan', title: 'План по контактам' },
  { id: 'actual', title: 'Актуальные контакты', count: actualFilteredRows.value.length },
  { id: 'new', title: 'Новые контакты', count: newFilteredRows.value.length },
  { id: 'our-events', title: 'Наши мероприятия' },
  { id: 'competitor-events', title: 'Мероприятия конкурентов' },
  { id: 'pains', title: 'Боли и предложения' },
]);

const actualRows = computed(() =>
  rows.value.filter((row) => row.partnerTypeId === 'active'),
);

const newRows = computed(() =>
  rows.value.filter((row) => row.partnerTypeId === 'new'),
);

const actualRelationStatusChips = computed(() =>
  recountChips(
    filterMonthlyReportRowsForChipCounts(actualRows.value, listFilterParams.value, 'relationStatuses'),
    relationStatusChipDefs.value,
    'relationStatusId',
  ),
);

const actualCurrentStatusChips = computed(() =>
  recountChips(
    filterMonthlyReportRowsForChipCounts(actualRows.value, listFilterParams.value, 'currentStatuses'),
    currentStatusChipDefs.value,
    'currentStatusId',
  ),
);

const newCurrentStatusChips = computed(() => {
  const options = newCurrentStatusOptions.value.length > 0
    ? newCurrentStatusOptions.value.map((option) => ({
      id: option.id,
      label: option.title,
      count: 0,
    }))
    : currentStatusChipDefs.value;
  return recountChips(
    filterMonthlyReportRowsForChipCounts(newRows.value, listFilterParams.value, 'newCurrentStatuses'),
    options,
    'agreementCurrentStatusId',
  );
});

const currentStatusOptions = computed(() =>
  currentStatusChipDefs.value.map((chip) => ({
    id: chip.id,
    title: chip.label,
  })),
);

const fieldEditorTitle = computed(() => 'Нозологии');

const fieldEditorPlaceholder = computed(() => fieldEditorTitle.value);

const fieldEditorOptions = computed(() => nosologyOptions.value);

const tableTitle = computed(() => 'Партнеры');

function getAssignedDisplay(row: MonthlyReportRow): UserDisplay | null {
  if (!row.assignedId) {
    return null;
  }
  const fromMap = userDisplaysById.value.get(String(row.assignedId));
  if (fromMap) {
    return fromMap;
  }
  const option = props.assignedOptions.find((item) => String(item.id) === String(row.assignedId));
  if (!option) {
    return null;
  }
  return {
    id: String(option.id),
    name: option.title,
    shortName: option.title,
    photo: '',
  };
}

function getAssignedPhoto(row: MonthlyReportRow): string {
  const photo = getAssignedDisplay(row)?.photo ?? '';
  if (!photo || failedAvatars.value.has(photo)) {
    return '';
  }
  return photo;
}

function markAvatarFailed(url: string) {
  if (!url) {
    return;
  }
  failedAvatars.value = new Set([...failedAvatars.value, url]);
}

function getRowProps(data: { item: MonthlyReportRow | { raw?: MonthlyReportRow } }) {
  const row = ('raw' in data.item && data.item.raw) ? data.item.raw : data.item as MonthlyReportRow;
  return {
    class: contactIdsWithReport.value.has(String(row.id))
      ? 'monthly-report-table__row--reported'
      : undefined,
  };
}

async function refreshReportHighlights() {
  try {
    contactIdsWithReport.value = await loadContactIdsWithReportForPeriod(reportPeriod.value);
  } catch (error) {
    console.warn('Не удалось загрузить отчёты за период:', error);
    contactIdsWithReport.value = new Set();
  }
}

async function refreshUserDisplays(sourceRows: MonthlyReportRow[]) {
  try {
    userDisplaysById.value = await loadUserDisplaysByIds(
      sourceRows.map((row) => row.assignedId),
    );
  } catch (error) {
    console.warn('Не удалось загрузить ответственных:', error);
    userDisplaysById.value = new Map();
  }
}

function toggleChipList(list: Ref<string[]>, id: string) {
  if (list.value.includes(id)) {
    list.value = list.value.filter((item) => item !== id);
    return;
  }
  list.value = [...list.value, id];
}

function toggleRelationStatus(id: string) {
  toggleChipList(selectedRelationStatuses, id);
}

function toggleCurrentStatus(id: string) {
  toggleChipList(selectedCurrentStatuses, id);
}

function toggleNewCurrentStatus(id: string) {
  toggleChipList(selectedNewCurrentStatuses, id);
}

function isAllSelected(
  selected: Array<string | number>,
  options: Array<{ id: string | number }>,
): boolean {
  if (!options.length) {
    return false;
  }
  const selectedSet = new Set(selected.map(String));
  return options.every((option) => selectedSet.has(String(option.id)));
}

function toggleAllAssigned(checked: boolean | null) {
  selectedAssigned.value = checked
    ? props.assignedOptions.map((option) => option.id)
    : [];
}

function toggleAllMonths(checked: boolean | null) {
  selectedMonths.value = checked
    ? monthOptions.map((option) => option.id)
    : [];
}

function toggleAllYears(checked: boolean | null) {
  selectedYears.value = checked
    ? yearOptions.map((option) => String(option.id))
    : [];
}

function toggleAllRelationStatuses(checked: boolean | null) {
  selectedRelationStatuses.value = checked
    ? actualRelationStatusChips.value.map((chip) => chip.id)
    : [];
}

function toggleAllCurrentStatuses(checked: boolean | null) {
  selectedCurrentStatuses.value = checked
    ? actualCurrentStatusChips.value.map((chip) => chip.id)
    : [];
}

function toggleAllNewCurrentStatuses(checked: boolean | null) {
  selectedNewCurrentStatuses.value = checked
    ? newCurrentStatusChips.value.map((chip) => chip.id)
    : [];
}

function toggleAttentionFilter(filter: 'no-touches' | 'no-next-step' | 'no-report') {
  attentionFilter.value = attentionFilter.value === filter ? 'all' : filter;
}

function openFieldEditor(row: MonthlyReportRow, kind: FieldEditorKind) {
  fieldEditorRow.value = row;
  fieldEditorKind.value = kind;
  fieldEditorPartner.value = [row.partnerName, row.organization].filter(Boolean).join(', ');
  fieldEditorIds.value = [...(row.nosologyIds ?? [])];
  fieldEditorOpen.value = true;
}

async function onFieldEditorSave(value: string[] | string | null) {
  const row = fieldEditorRow.value;
  if (!row) {
    return;
  }

  await onNosologiesChange(row, Array.isArray(value) ? value : []);
  fieldEditorOpen.value = false;
}

async function onRelationStatusChange(row: MonthlyReportRow, statusId: string | null) {
  const nextId = statusId ? String(statusId) : '';
  const option = relationStatusOptions.value.find((item) => item.id === nextId);
  const prevId = row.relationStatusId;
  const prevLabel = row.relationStatus;

  row.relationStatusId = nextId;
  row.relationStatus = option?.title ?? '';
  // Не пересчитываем partnerTypeId при ручном изменении статуса

  savingCell.value = true;
  try {
    await updateContactRelationStatus(row.id, nextId);
  } catch (error) {
    row.relationStatusId = prevId;
    row.relationStatus = prevLabel;
    console.error('Не удалось сохранить статус отношений:', error);
    window.alert('Не удалось сохранить статус отношений');
  } finally {
    savingCell.value = false;
  }
}

async function onCurrentStatusChange(row: MonthlyReportRow, statusId: string | null) {
  const nextId = statusId ? String(statusId) : '';
  const option = currentStatusOptions.value.find((item) => item.id === nextId);
  const prevId = row.currentStatusId;
  const prevLabel = row.currentStatus;

  row.currentStatusId = nextId;
  row.currentStatus = option?.title ?? '';

  savingCell.value = true;
  try {
    await updateContactCurrentStatus(row.id, nextId);
  } catch (error) {
    row.currentStatusId = prevId;
    row.currentStatus = prevLabel;
    console.error('Не удалось сохранить текущий статус:', error);
    window.alert('Не удалось сохранить текущий статус');
  } finally {
    savingCell.value = false;
  }
}

async function onNosologiesChange(row: MonthlyReportRow, value: unknown) {
  const nextIds = Array.isArray(value)
    ? value.map((id) => String(id)).filter(Boolean)
    : [];
  const prevIds = [...(row.nosologyIds ?? [])];
  const prevLabel = row.nosologies;

  row.nosologyIds = nextIds;
  row.nosologies = nextIds
    .map((id) => nosologyOptions.value.find((option) => option.id === id)?.title ?? id)
    .join(', ');

  savingCell.value = true;
  try {
    await updateContactNosologies(row.id, nextIds);
  } catch (error) {
    row.nosologyIds = prevIds;
    row.nosologies = prevLabel;
    console.error('Не удалось сохранить нозологии:', error);
    window.alert('Не удалось сохранить нозологии');
  } finally {
    savingCell.value = false;
  }
}

async function onInterestBlur(row: MonthlyReportRow) {
  const nextValue = String(row.interest ?? '').trim();
  row.interest = nextValue;

  savingCell.value = true;
  try {
    await updateContactInterest(row.id, nextValue);
  } catch (error) {
    console.error('Не удалось сохранить поле «Чем интересен»:', error);
    window.alert('Не удалось сохранить поле «Чем интересен»');
  } finally {
    savingCell.value = false;
  }
}

function openEventDetails(eventId: string) {
  if (!eventId) {
    return;
  }
  openBitrixPath(`/crm/type/1052/details/${eventId}/`);
}

function openInNewWindow(path: string) {
  if (!path || path === '#') {
    return;
  }
  openBitrixPathInNewWindow(path);
}

function openContact(contactId: string) {
  if (!contactId) {
    return;
  }
  openBitrixPath(buildContactDetailsPath(contactId));
}

function openReports(row: MonthlyReportRow) {
  if (!row.id) {
    return;
  }
  const label = [row.partnerName, row.organization].filter(Boolean).join(', ');
  openBitrixPath(buildMonthlyReportSpaListPath(row.id, label || undefined));
}

function openAgreement(agreementId: string) {
  if (!agreementId) {
    return;
  }
  openBitrixPath(`/crm/type/1236/details/${agreementId}/`);
}

function touchCount(row: MonthlyReportRow, kind: TouchKind): number {
  return countTouchesByKind(
    row.touches ?? [],
    kind,
    touchesPeriod.value.months,
    touchesPeriod.value.years,
  );
}

function openTouchesDialog(row: MonthlyReportRow, kind: TouchKind) {
  touchesDialogPartner.value = [row.partnerName, row.organization].filter(Boolean).join(', ');
  touchesDialogContactId.value = row.id;
  touchesDialogItems.value = row.touches ?? [];
  touchesDialogKind.value = kind;
  touchesDialogOpen.value = true;
}

function openTouchItem(touch: MonthlyTouchItem) {
  openBitrixPath(buildTouchDetailsPath(touch.id));
}

function createTouchFromDialog() {
  if (!touchesDialogContactId.value) {
    return;
  }
  touchCreateOpen.value = true;
}

async function onTouchCreated() {
  const contactId = touchesDialogContactId.value;
  if (!contactId) {
    return;
  }

  try {
    const byContact = await loadTouchesByContactIds([contactId]);
    const nextTouches = byContact.get(contactId) ?? [];
    touchesDialogItems.value = nextTouches;
    const row = rows.value.find((item) => item.id === contactId);
    if (row) {
      row.touches = nextTouches;
    }
  } catch (error) {
    console.error('Не удалось обновить список касаний:', error);
  }
}

function openTasksDialog(row: MonthlyReportRow) {
  tasksDialogPartner.value = [row.partnerName, row.organization].filter(Boolean).join(', ');
  tasksDialogItems.value = row.taskItems ?? [];
  tasksDialogOpen.value = true;
}

function openTaskItem(task: MonthlyTaskItem) {
  openBitrixPathInNewWindow(buildTaskDetailsPath(task.id));
}

async function submitRow(row: MonthlyReportRow) {
  if (sendingRowId.value) {
    return;
  }

  submitError.value = '';
  sendingRowId.value = row.id;

  try {
    // По умолчанию период = текущий месяц; касания в SPA только за этот период.
    const period = resolveReportPeriod(selectedMonths.value, selectedYears.value);
    const created = await createMonthlyReportSpaItem(row, period);
    contactIdsWithReport.value = new Set([...contactIdsWithReport.value, String(row.id)]);
    openBitrixPath(buildMonthlyReportSpaDetailsPath(created.id), () => {
      void refreshReportHighlights();
    });
  } catch (error) {
    console.error('Не удалось создать отчётность:', error);
    submitError.value = error instanceof Error ? error.message : 'Не удалось создать отчётность';
    window.alert(submitError.value);
  } finally {
    sendingRowId.value = null;
  }
}

async function refreshTableScroll() {
  await nextTick();
  refreshStickyReportTableHeaders();
}

watch(reportPeriod, () => {
  if (isLoading.value) {
    return;
  }
  void refreshReportHighlights();
}, { deep: true });

watch(actualFilteredRows, () => {
  void refreshTableScroll();
});

watch(newFilteredRows, () => {
  void refreshTableScroll();
});

watch(activeTab, async (tab) => {
  if (tab !== 'actual' && tab !== 'new') {
    return;
  }
  await nextTick();
  mountStickyReportTableHeaders();
  void refreshTableScroll();
});

watch(isLoading, (loading) => {
  if (loading) {
    return;
  }
  mountStickyReportTableHeaders();
  void refreshTableScroll();
});

async function loadData() {
  isLoading.value = true;
  loadingProgress.value = 0;
  loadingMessage.value = 'Загрузка партнёров…';

  try {
    loadingProgress.value = 25;
    const data = await loadMonthlyReportData({
      months: selectedMonths.value,
      years: selectedYears.value,
    });
    loadingProgress.value = 90;
    rows.value = data.rows;
    relationStatusChipDefs.value = data.relationStatusChips;
    relationStatusOptions.value = data.relationStatusOptions;
    currentStatusChipDefs.value = data.currentStatusChips;
    newCurrentStatusOptions.value = data.newCurrentStatusOptions;
    nosologyOptions.value = data.nosologyOptions;
    await Promise.all([
      refreshUserDisplays(data.rows),
      refreshReportHighlights(),
    ]);
    loadingProgress.value = 100;
    loadingMessage.value = 'Готово';
    window.setTimeout(() => {
      isLoading.value = false;
    }, 150);
  } catch (error) {
    console.error('Не удалось загрузить ежемесячную отчётность:', error);
    rows.value = [];
    loadingProgress.value = 100;
    isLoading.value = false;
  }
}

onMounted(() => {
  void runWhenBx24Ready(loadData);
});

onUnmounted(() => {
  unmountStickyReportTableHeaders();
});
</script>

<style scoped>
.events-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.events-list__item {
  display: flex;
  align-items: start;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  color: #1a1a1a;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 0.2s;
}

.events-list__item:hover {
  background-color: #f5f5f5;
}

.events-list__bullet {
    color: #1976d2;
    font-size: 3.75rem;
    margin-left: -0.7rem;
    line-height: 0.15;
}

.events-list__title {
  word-break: break-word;
}

.events-list__empty {
  color: #9e9e9e;
  font-size: 12px;
  font-style: italic;
}

.agreement-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background-color: #e3f2fd;
  border-radius: 8px;
  font-size: 12px;
}

.agreement-info__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agreement-info__label {
  font-weight: 500;
  color: #546e7a;
  font-size: 11px;
}

.agreement-info__value {
  color: #1a1a1a;
  font-weight: 400;
}

.agreement-info__empty {
  color: #9e9e9e;
  font-size: 12px;
  font-style: italic;
}

.agreement-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  background: transparent;
  border-radius: 0;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 0.2s;
}

.agreement-cell:hover {
  background-color: #f5f5f5;
}

.agreement-cell__item {
  font-size: 12px;
  color: #1a1a1a;
}

.agreement-cell__text {
  color: #1a1a1a;
}

.task-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 50%;
  background-color: #e3f2fd;
  color: #1565c0;
  font-weight: 600;
  font-size: 14px;
}

.table-header__icon {
  display: flex;
  align-items: center;
  gap: 4px;
}

.table-header__icon .v-icon {
  color: #1976d2;
}

.monthly-touch-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.monthly-touch-cell:hover {
  background-color: #f5f5f5;
}

.monthly-touch-cell strong {
  font-size: 14px;
  color: #1a1a1a;
}

.monthly-touch-cell .v-icon {
  color: #1976d2;
}

.monthly-table__send {
  background-color: #4caf50 !important;
  border: 1px solid #4caf50 !important;
  color: #ffffff !important;
  font-weight: 500;
}

.monthly-table__send:hover {
  background-color: #43a047 !important;
}

.monthly-table__send .v-icon {
  color: #1a1a1a !important;
}

.report-header__logo {
  display: block;
  width: auto;
  height: 3.25rem;
  max-width: min(100%, 20rem);
  object-fit: contain;
}
</style>

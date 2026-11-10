/**
 * Общие идентификаторы рабочей группы «Отдел по работе с партнерами».
 * Вынесено отдельным модулем, чтобы избежать циклических импортов
 * между навигацией и загрузчиками задач.
 */

/** Рабочая группа «Задачи "Отдел по работе с партнерами"». */
export const TASKS_PARTNERS_GROUP_ID = 1314;

/** Путь к списку задач группы в Bitrix. */
export const TASKS_GROUP_LIST_PATH = `/workgroups/group/${TASKS_PARTNERS_GROUP_ID}/tasks/`;

/** Путь к карточке задачи внутри группы. */
export function buildGroupTaskDetailsPath(taskId: string | number): string {
  return `${TASKS_GROUP_LIST_PATH}task/view/${taskId}/`;
}

/**
 * Префикс привязки мероприятия в UF_CRM_TASK — «T41c_».
 *
 * В UF_CRM_TASK элемент смарт-процесса кодируется как T<id>c_<itemId>,
 * где <id> — это НЕ id типа из crm.type.list (38), а номер смарт-процесса
 * в crm.item: entityTypeId 1052 → 1052 - 1000 - 11 = 41.
 * Проверено на портале: реальные задачи содержат «T41c_470», «T41c_344».
 */
export const EVENTS_CRM_TASK_PREFIX = 'T41c_';

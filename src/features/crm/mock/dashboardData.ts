export interface NavItem {
  id: string;
  title: string;
  href: string;
  isBrand?: boolean;
}

export interface NavGroup {
  id: string;
  title: string;
  isBrand?: boolean;
  /** Прямой переход без выпадающего списка. */
  item?: NavItem;
  children?: NavItem[];
}

export interface SummaryMetric {
  id: string;
  label: string;
  value: number;
}

export interface ChartItem {
  id?: string;
  label: string;
  value: number;
}

export interface ChartBlock {
  id: string;
  title: string;
  items: ChartItem[];
}

export const navItems: NavItem[] = [
  { id: 'crm', title: 'Цифровое рабочее место', href: '#', isBrand: true },
  { id: 'partners', title: 'Справочник партнеров', href: '#' },
  { id: 'organizations', title: 'Справочник организаций', href: '#' },
  { id: 'our-events', title: 'Наши мероприятия', href: '#' },
  { id: 'competitor-events', title: 'Мероприятия конкурентов', href: '#' },
  { id: 'potential-partners', title: 'Потенциальные партнеры', href: '#' },
  { id: 'tasks', title: 'Задачи', href: '#' },
  { id: 'analytics', title: 'Аналитика', href: '#' },
  { id: 'monthly-report', title: 'Ежемесячная отчетность', href: '#' },
];

function navById(id: string): NavItem {
  const item = navItems.find((entry) => entry.id === id);
  if (!item) {
    throw new Error(`Nav item not found: ${id}`);
  }
  return item;
}

/** Группы вкладок (вариант 1: таб + выпадающий список). */
export const navGroups: NavGroup[] = [
  {
    id: 'crm',
    title: 'Цифровое рабочее место',
    isBrand: true,
    item: navById('crm'),
  },
  {
    id: 'directories',
    title: 'Справочники',
    children: [navById('partners'), navById('organizations')],
  },
  {
    id: 'events',
    title: 'Мероприятия',
    children: [navById('our-events'), navById('competitor-events')],
  },
  {
    id: 'development',
    title: 'Развитие партнеров',
    children: [navById('tasks'), navById('potential-partners')],
  },
  {
    id: 'reports',
    title: 'Отчетность и аналитика',
    children: [navById('monthly-report'), navById('analytics')],
  },
];

export const summaryMetrics: SummaryMetric[] = [
  { id: 'partners', label: 'Партнеров', value: 0 },
  { id: 'nosologies', label: 'Нозологий', value: 0 },
  { id: 'our-events', label: 'Наши мероприятия', value: 0 },
  { id: 'competitor-events', label: 'Мероприятия конкурентов', value: 0 },
];

export const charts: ChartBlock[] = [
  {
    id: 'nosologies-partners',
    title: 'Нозологии и партнеры',
    items: [],
  },
  {
    id: 'partners-potential',
    title: 'Партнеры и коммерч. потенциал',
    items: [],
  },
];

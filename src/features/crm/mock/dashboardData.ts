export interface NavItem {
  id: string;
  title: string;
  href: string;
  isBrand?: boolean;
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

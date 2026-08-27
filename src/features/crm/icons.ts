import {
  mdiAccountGroupOutline,
  mdiAccountOutline,
  mdiAlert,
  mdiCalendarMonthOutline,
  mdiCalendarOutline,
  mdiChevronRight,
  mdiHandshakeOutline,
  mdiMagnify,
  mdiMinusCircle,
  mdiPlus,
  mdiPlusCircle,
} from '@mdi/js';

/** SVG-пути для Vuetify mdi-svg (строки mdi-* без шрифта не рисуются). */
export const appIcons = {
  accountGroupOutline: mdiAccountGroupOutline,
  accountOutline: mdiAccountOutline,
  alert: mdiAlert,
  calendarMonthOutline: mdiCalendarMonthOutline,
  calendarOutline: mdiCalendarOutline,
  chevronRight: mdiChevronRight,
  handshakeOutline: mdiHandshakeOutline,
  magnify: mdiMagnify,
  minusCircle: mdiMinusCircle,
  plus: mdiPlus,
  plusCircle: mdiPlusCircle,
} as const;

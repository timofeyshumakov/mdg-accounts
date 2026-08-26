import {
  mdiAccountOutline,
  mdiCalendarMonthOutline,
  mdiCalendarOutline,
  mdiHandshakeOutline,
  mdiMagnify,
  mdiMinusCircle,
  mdiPlus,
  mdiPlusCircle,
} from '@mdi/js';

/** SVG-пути для Vuetify mdi-svg (строки mdi-* без шрифта не рисуются). */
export const appIcons = {
  accountOutline: mdiAccountOutline,
  calendarMonthOutline: mdiCalendarMonthOutline,
  calendarOutline: mdiCalendarOutline,
  handshakeOutline: mdiHandshakeOutline,
  magnify: mdiMagnify,
  minusCircle: mdiMinusCircle,
  plus: mdiPlus,
  plusCircle: mdiPlusCircle,
} as const;

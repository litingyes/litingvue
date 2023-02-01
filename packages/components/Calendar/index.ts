import type { App } from 'vue-demi'
import Calendar from './Calendar.vue'

export const LvCalendar = Calendar

LvCalendar.install = (app: App) => {
  app.component('LvCalendar', LvCalendar)
}

export default LvCalendar

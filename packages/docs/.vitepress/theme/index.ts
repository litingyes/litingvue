import DefaultTheme from 'vitepress/theme'
import { LvCalendar } from 'litingvue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('LvCalendar', LvCalendar)
  },
}

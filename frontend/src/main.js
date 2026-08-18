import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { expandTelegramWebApp, getInitData, getStartParam, initTelegramWebApp } from './services/telegram'
import { registerTelegram } from './services/api'
import './style.css'

import AppShell from './components/layout/AppShell.vue'
import HomeView from './views/HomeView.vue'
import EarnView from './views/EarnView.vue'
import TopView from './views/TopView.vue'
import InviteView from './views/InviteView.vue'
import WithdrawView from './views/WithdrawView.vue'
import AdminDashboard from './views/AdminDashboard.vue'

const AUTH_READY_EVENT = 'gr-auth-ready'

const routes = [
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', redirect: '/home' },
      { path: 'home', name: 'home', component: HomeView, meta: { navTab: 'home' } },
      { path: 'earn', name: 'earn', component: EarnView, meta: { navTab: 'earn' } },
      { path: 'top', name: 'top', component: TopView, meta: { navTab: 'top' } },
      { path: 'invite', name: 'invite', component: InviteView, meta: { navTab: 'invite' } },
      { path: 'withdraw', name: 'withdraw', component: WithdrawView, meta: { navTab: 'withdraw' } },
    ],
  },
  { path: '/admin-dashboard', name: 'admin-dashboard', component: AdminDashboard },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

async function authenticate() {
  try {
    const initData = getInitData()
    const startParam = getStartParam()
    if (initData) {
      await registerTelegram(initData, startParam)
    } else if (!(window.Telegram && window.Telegram.WebApp)) {
      await registerTelegram(null, startParam)
    }
    window.dispatchEvent(new Event(AUTH_READY_EVENT))
  } catch (err) {
    console.error('Auth failed', err)
    window.dispatchEvent(new Event(AUTH_READY_EVENT))
  }
}

function boot() {
  try {
    initTelegramWebApp()
  } catch (err) {
    console.error('Telegram init failed', err)
  }

  try {
    createApp(App).use(router).mount('#app')
  } catch (err) {
    console.error('Vue mount failed', err)
  }

  try {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        expandTelegramWebApp()
      })
    } else {
      setTimeout(expandTelegramWebApp, 0)
    }
  } catch (err) {
    console.error('Telegram expand failed', err)
  }

  authenticate()
}

boot()

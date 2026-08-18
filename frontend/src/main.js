import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import {
  expandTelegramWebApp,
  getInitData,
  getStartParam,
  initTelegramWebApp,
  isInsideTelegram,
} from './services/telegram'
import { registerTelegram } from './services/api'
import './style.css'

import AppShell from './components/layout/AppShell.vue'
import HomeView from './views/HomeView.vue'
import EarnView from './views/EarnView.vue'
import TopView from './views/TopView.vue'
import InviteView from './views/InviteView.vue'
import WithdrawView from './views/WithdrawView.vue'
import AdminDashboard from './views/AdminDashboard.vue'

var AUTH_READY_EVENT = 'gr-auth-ready'

var routes = [
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

var router = createRouter({
  history: createWebHistory(),
  routes,
})

function dispatchAuthReady(detail) {
  try {
    window.dispatchEvent(new CustomEvent(AUTH_READY_EVENT, { detail: detail || {} }))
  } catch (err) {
    console.error('Auth event failed', err)
  }
}

function authErrorMessage(err) {
  if (err && err.response && err.response.data && err.response.data.detail) {
    return String(err.response.data.detail)
  }
  if (err && err.message) return String(err.message)
  return 'Authentication failed. Close and reopen the Mini App from Telegram.'
}

function scheduleAuth() {
  setTimeout(function () {
    authenticate()
  }, 0)
}

async function authenticate() {
  var initData = null
  var startParam = ''
  try {
    initData = getInitData()
    startParam = getStartParam()
    if (initData) {
      await registerTelegram(initData, startParam)
      dispatchAuthReady({ ok: true })
      return
    }
    if (!isInsideTelegram()) {
      await registerTelegram(null, startParam)
      dispatchAuthReady({ ok: true })
      return
    }
    dispatchAuthReady({
      ok: false,
      error: 'Telegram login data was not available. Close and reopen the Mini App from the bot.',
    })
  } catch (err) {
    console.error('Auth failed', err)
    dispatchAuthReady({ ok: false, error: authErrorMessage(err) })
  }
}

function scheduleExpand() {
  setTimeout(function () {
    expandTelegramWebApp()
  }, 300)
}

function installGlobalGuards() {
  window.addEventListener('error', function (event) {
    console.error('Window error', event.error || event.message)
  })
  window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled rejection', event.reason)
  })
}

function boot() {
  installGlobalGuards()

  try {
    initTelegramWebApp()
  } catch (err) {
    console.error('Telegram init failed', err)
  }

  try {
    createApp(App).use(router).mount('#app')
  } catch (err) {
    console.error('Vue mount failed', err)
    return
  }

  scheduleExpand()
  scheduleAuth()
}

boot()

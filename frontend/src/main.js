import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { initTelegramWebApp, getInitData } from './services/telegram'
import { registerTelegram } from './services/api'
import './style.css'

import AppShell from './components/layout/AppShell.vue'
import HomeView from './views/HomeView.vue'
import EarnView from './views/EarnView.vue'
import TopView from './views/TopView.vue'
import InviteView from './views/InviteView.vue'
import WithdrawView from './views/WithdrawView.vue'
import AdminDashboard from './views/AdminDashboard.vue'

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

async function boot() {
  const isTelegramApp = initTelegramWebApp()
  const params = new URLSearchParams(window.location.search)
  const startParam =
    window.Telegram?.WebApp?.initDataUnsafe?.start_param ||
    params.get('tgWebAppStartParam') ||
    params.get('ref') ||
    ''

  try {
    if (isTelegramApp) {
      const initData = getInitData()
      await registerTelegram(initData || null, startParam)
    } else {
      await registerTelegram(null, startParam)
    }
  } catch (err) {
    console.error('Auth failed', err)
  }

  createApp(App).use(router).mount('#app')
}

boot()

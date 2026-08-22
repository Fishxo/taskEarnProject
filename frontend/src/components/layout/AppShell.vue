<template>
  <div class="shell">
    <div class="shell-glow" aria-hidden="true"></div>

    <header class="topbar">
      <div class="brand-wrap">
        <div class="brand-mark">GR</div>
        <div>
          <div class="brand">Get Rewards</div>
          <div class="brand-sub">Earn · Invite · Withdraw</div>
        </div>
      </div>
      <router-link v-if="user && user.is_admin" class="admin-link" to="/admin-dashboard">Admin</router-link>
    </header>

    <p v-if="authError" class="auth-error">{{ authError }}</p>

    <main class="main">
      <router-view />
    </main>

    <nav class="nav">
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: navTab === item.tab }"
      >
        <span class="icon" v-html="item.icon"></span>
        <span class="label">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getMe } from '../../services/api'

const route = useRoute()
const user = ref(null)
const authError = ref('')
const navTab = computed(() => route.meta.navTab)

provide('user', user)
provide('refreshUser', loadUser)

const items = [
  {
    to: '/home',
    tab: 'home',
    label: 'መነሻ',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 3.5 10.2V21h6.2v-6.2h4.6V21h6.2V10.2L12 3.2Z"/></svg>`,
  },
  {
    to: '/earn',
    tab: 'earn',
    label: 'Earn',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 10-14h-7l1-6Z"/></svg>`,
  },
  {
    to: '/top',
    tab: 'top',
    label: 'Top',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4h10v2h3l-2.2 7.2A4 4 0 0 1 14 16H10a4 4 0 0 1-3.8-2.8L4 6h3V4Zm1 16h8v2H8v-2Z"/></svg>`,
  },
  {
    to: '/invite',
    tab: 'invite',
    label: 'ጋብዝ',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11a4 4 0 1 0-3.9-4.8A4 4 0 0 0 16 11ZM8 12a3.5 3.5 0 1 0-3.4-4.2A3.5 3.5 0 0 0 8 12Zm8 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4ZM8 14c-.3 0-.7 0-1 .1C4.4 14.5 2 15.7 2 18v2h5v-2c0-1.5.8-2.7 2.1-3.6-.4-.2-.8-.3-1.1-.4Z"/></svg>`,
  },
  {
    to: '/withdraw',
    tab: 'withdraw',
    label: 'Withdraw',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9ZM5 9h14v2H5V9Zm2 5h5v2H7v-2Z"/></svg>`,
  },
]

async function loadUser() {
  try {
    user.value = await getMe()
  } catch {
    user.value = null
  }
}

function onAuthReady(event) {
  var detail = (event && event.detail) || {}
  if (detail.ok === false && detail.error) {
    authError.value = detail.error
  } else {
    authError.value = ''
  }
  loadUser()
}

onMounted(function () {
  loadUser()
  window.addEventListener('gr-auth-ready', onAuthReady)
})

onUnmounted(function () {
  window.removeEventListener('gr-auth-ready', onAuthReady)
})
</script>

<style scoped>
.shell {
  min-height: 100vh;
  max-width: 430px;
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto 1fr auto;
  position: relative;
  isolation: isolate;
}

.shell-glow {
  position: fixed;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 140, 255, 0.18), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.topbar {
  padding: 0.9rem 1rem 0.35rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-mark {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  background: var(--grad-active);
  box-shadow: 0 8px 20px rgba(109, 124, 255, 0.35);
}

.brand {
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.brand-sub {
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 0.1rem;
}

.admin-link {
  font-size: 0.78rem;
  font-weight: 700;
  color: #dbe2ff;
  border: 1px solid var(--border-strong);
  background: rgba(124, 140, 255, 0.1);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
}

.main {
  padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 0.65rem);
  position: relative;
  z-index: 1;
}

.nav {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(0.5rem + var(--safe-bottom));
  width: calc(100% - 1.1rem);
  max-width: 410px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.1rem;
  padding: 0.5rem 0.4rem;
  background: rgba(12, 16, 32, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(124, 140, 255, 0.08) inset;
  z-index: 20;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.18rem;
  color: var(--muted-soft);
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.28rem 0.1rem;
  border-radius: 16px;
  transition: color 0.15s ease;
}

.icon {
  width: 2.4rem;
  height: 2.4rem;
  display: grid;
  place-items: center;
  border-radius: 14px;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.icon :deep(svg) {
  width: 1.12rem;
  height: 1.12rem;
}

.nav-item.active {
  color: #fff;
}

.nav-item.active .icon {
  background: var(--grad-active);
  box-shadow: 0 8px 20px rgba(109, 124, 255, 0.4);
}

.auth-error {
  margin: 0 1rem 0.75rem;
  padding: 0.8rem 0.9rem;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  font-size: 0.84rem;
  line-height: 1.45;
  position: relative;
  z-index: 1;
}
</style>

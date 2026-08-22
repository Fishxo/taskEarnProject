<template>
  <div class="shell">
    <div class="accent-bar" aria-hidden="true"></div>

    <header class="topbar">
      <div class="brand-wrap">
        <div class="brand-mark">💸</div>
        <div>
          <div class="brand">Get Rewards</div>
          <div class="brand-sub">Skill Money · ETB</div>
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
        <span v-if="navTab === item.tab" class="indicator"></span>
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
}

.accent-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #14b8a6, #2dd4bf, #fbbf24, #14b8a6);
  z-index: 30;
  max-width: 430px;
  margin: 0 auto;
}

.topbar {
  padding: 1rem 1rem 0.4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.brand-mark {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  background: var(--bg-card);
  border: 2px solid var(--accent);
  box-shadow: 0 0 16px rgba(45, 212, 191, 0.25);
}

.brand {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.brand-sub {
  font-size: 0.72rem;
  color: var(--gold);
  font-weight: 600;
  margin-top: 0.05rem;
}

.admin-link {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-bright);
  border: 1px solid var(--border-strong);
  background: rgba(45, 212, 191, 0.08);
  border-radius: 999px;
  padding: 0.38rem 0.7rem;
}

.main {
  padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 0.5rem);
}

.nav {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(0.4rem + var(--safe-bottom));
  width: calc(100% - 0.8rem);
  max-width: 414px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 0.55rem 0.25rem 0.45rem;
  background: #141917;
  border: 1px solid rgba(45, 212, 191, 0.15);
  border-radius: 20px;
  box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.5);
  z-index: 20;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  color: var(--muted-soft);
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2rem 0;
  position: relative;
}

.icon {
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  border-radius: 10px;
}

.icon :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.nav-item.active {
  color: var(--accent-bright);
}

.nav-item.active .icon {
  color: var(--gold);
}

.indicator {
  position: absolute;
  top: -0.55rem;
  width: 1.4rem;
  height: 3px;
  border-radius: 999px;
  background: var(--grad-gold);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
}

.auth-error {
  margin: 0 1rem 0.65rem;
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #fca5a5;
  font-size: 0.82rem;
  line-height: 1.4;
}
</style>

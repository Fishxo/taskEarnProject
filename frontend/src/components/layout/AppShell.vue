<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">Get Rewards</div>
      <router-link v-if="user?.is_admin" class="admin-link" to="/admin-dashboard">Admin</router-link>
    </header>

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
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getMe } from '../../services/api'

const route = useRoute()
const user = ref(null)
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

onMounted(loadUser)
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

.topbar {
  padding: 0.85rem 1rem 0.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  font-size: 1.05rem;
  font-weight: 700;
}

.admin-link {
  font-size: 0.85rem;
  font-weight: 700;
  color: #b7c0ff;
  border: 1px solid rgba(109, 124, 255, 0.35);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
}

.main {
  padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 0.5rem);
}

.nav {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(0.45rem + var(--safe-bottom));
  width: min(410px, calc(100% - 1rem));
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.15rem;
  padding: 0.45rem 0.35rem;
  background: rgba(14, 18, 36, 0.94);
  border: 1px solid var(--border);
  border-radius: 22px;
  backdrop-filter: blur(12px);
  z-index: 20;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  color: var(--muted);
  font-size: 0.7rem;
  padding: 0.25rem 0.1rem;
}

.icon {
  width: 2.35rem;
  height: 2.35rem;
  display: grid;
  place-items: center;
  border-radius: 12px;
}

.icon :deep(svg) {
  width: 1.15rem;
  height: 1.15rem;
}

.nav-item.active {
  color: #fff;
}

.nav-item.active .icon {
  background: var(--grad-active);
  box-shadow: 0 8px 18px rgba(109, 124, 255, 0.35);
}
</style>

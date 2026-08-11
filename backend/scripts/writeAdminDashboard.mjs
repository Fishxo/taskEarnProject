import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'frontend/src/views/AdminDashboard.vue');

const code = `<template>
  <section class="admin">
    <header class="top">
      <div>
        <h1>Admin</h1>
        <p>Get Rewards control panel</p>
      </div>
      <router-link class="back" to="/home">Back to app</router-link>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="stats" v-if="stats">
      <div><small>Users</small><strong>{{ stats.users }}</strong></div>
      <div><small>Pending</small><strong>{{ stats.pending_withdrawals }}</strong></div>
      <div><small>Paid</small><strong>{{ stats.paid_withdrawals }}</strong></div>
      <div><small>Total paid</small><strong>{{ format(stats.total_paid) }}</strong></div>
    </div>

    <div class="tabs">
      <button :class="{ on: tab === 'withdrawals' }" @click="tab = 'withdrawals'">Withdrawals</button>
      <button :class="{ on: tab === 'users' }" @click="tab = 'users'">Users</button>
    </div>

    <div v-if="tab === 'withdrawals'" class="panel">
      <div class="filters">
        <button :class="{ on: wFilter === 'pending' }" @click="setWFilter('pending')">Pending</button>
        <button :class="{ on: wFilter === 'paid' }" @click="setWFilter('paid')">Paid</button>
        <button :class="{ on: wFilter === 'rejected' }" @click="setWFilter('rejected')">Rejected</button>
        <button :class="{ on: wFilter === 'all' }" @click="setWFilter('all')">All</button>
      </div>

      <div v-if="loading" class="muted">Loading...</div>
      <ul v-else class="list">
        <li v-for="w in withdrawals" :key="w.id" class="card">
          <div class="row">
            <strong>{{ w.user_name || ('User #' + w.user_id) }}</strong>
            <span class="amt">{{ format(w.amount) }} ETB</span>
          </div>
          <div class="meta">{{ w.method }} · {{ w.account }}</div>
          <div class="meta">{{ w.status }} · {{ w.created_label || w.created_at }}</div>
          <div v-if="w.status === 'pending'" class="actions">
            <button class="ok" :disabled="busyId === w.id" @click="decide(w.id, 'paid')">Approve</button>
            <button class="no" :disabled="busyId === w.id" @click="decide(w.id, 'rejected')">Reject</button>
          </div>
        </li>
        <li v-if="!withdrawals.length" class="muted">No withdrawals.</li>
      </ul>
    </div>

    <div v-else class="panel">
      <div v-if="loading" class="muted">Loading...</div>
      <ul v-else class="list">
        <li v-for="u in users" :key="u.id" class="card">
          <div class="row">
            <strong>{{ displayName(u) }}</strong>
            <span class="amt">{{ format(u.balance_total) }} ETB</span>
          </div>
          <div class="meta">TG {{ u.telegram_id }} · earned {{ format(u.total_earned) }}</div>
          <div class="meta">{{ u.is_admin ? 'ADMIN' : 'user' }} · {{ u.username || '-' }}</div>
        </li>
        <li v-if="!users.length" class="muted">No users.</li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import {
  getAdminStats,
  listAdminUsers,
  listAdminWithdrawals,
  reviewWithdrawal,
} from '../services/api'

const tab = ref('withdrawals')
const wFilter = ref('pending')
const stats = ref(null)
const users = ref([])
const withdrawals = ref([])
const loading = ref(false)
const error = ref('')
const busyId = ref(null)

function format(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function displayName(u) {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || ('#' + u.id)
}

async function loadStats() {
  stats.value = await getAdminStats()
}

async function loadUsers() {
  users.value = await listAdminUsers()
}

async function loadWithdrawals() {
  withdrawals.value = await listAdminWithdrawals(wFilter.value)
}

async function setWFilter(f) {
  wFilter.value = f
  loading.value = true
  try {
    await loadWithdrawals()
  } finally {
    loading.value = false
  }
}

async function decide(id, status) {
  busyId.value = id
  try {
    await reviewWithdrawal(id, status)
    await Promise.all([loadWithdrawals(), loadStats()])
  } catch (e) {
    error.value = e.response?.data?.detail || 'Action failed'
  } finally {
    busyId.value = null
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadStats(), loadWithdrawals(), loadUsers()])
  } catch (e) {
    error.value = e.response?.data?.detail || 'Admin access required'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.admin {
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem 1rem 2rem;
  min-height: 100vh;
  background: #0a0f1e;
  color: #fff;
}
.top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.top h1 { margin: 0; font-size: 1.5rem; }
.top p { margin: 0.25rem 0 0; color: #9aa6c8; }
.back {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 999px;
  padding: 0.5rem 0.85rem;
  color: #c7ceff;
  text-decoration: none;
  white-space: nowrap;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.stats div {
  background: #161d3a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 0.75rem 0.5rem;
  text-align: center;
}
.stats small { display: block; color: #9aa6c8; margin-bottom: 0.25rem; font-size: 0.75rem; }
.stats strong { font-size: 1.05rem; }
.tabs, .filters {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.85rem;
}
.tabs button, .filters button {
  border: 1px solid rgba(255,255,255,0.1);
  background: #121833;
  color: #c7d0f5;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
}
.tabs button.on, .filters button.on {
  background: linear-gradient(160deg, #8b7cff, #5a6ef5);
  color: #fff;
  border-color: transparent;
}
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.55rem; }
.card {
  background: #161d3a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 0.85rem;
}
.row { display: flex; justify-content: space-between; gap: 0.75rem; }
.amt { color: #b7c0ff; font-weight: 800; }
.meta { color: #9aa6c8; font-size: 0.85rem; margin-top: 0.25rem; }
.actions { display: flex; gap: 0.45rem; margin-top: 0.7rem; }
.ok, .no {
  flex: 1;
  border-radius: 10px;
  padding: 0.6rem;
  font-weight: 700;
}
.ok { background: #22c55e; color: #062012; }
.no { background: #4b1f2f; color: #ffd0d0; }
.error { color: #ef6b6b; }
.muted { color: #9aa6c8; }
@media (max-width: 560px) {
  .stats { grid-template-columns: 1fr 1fr; }
}
</style>
`;

fs.writeFileSync(out, code, 'utf8');
console.log('AdminDashboard written');

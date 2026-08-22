<template>
  <section class="page">
    <div class="head">
      <div class="trophy">🏆</div>
      <div>
        <h1 class="page-title">ከፍተኛ ገቢ ያገኙ</h1>
        <p class="page-sub">Live leaderboard · በቀጥታ ይዘመናል</p>
      </div>
    </div>

    <div class="podium" v-if="top3.length">
      <div v-for="(u, idx) in podiumOrder" :key="u.id" class="seat" :class="'r' + u.rank">
        <div class="badge">{{ badge(u.rank) }}</div>
        <div class="avatar">{{ initial(u) }}</div>
        <strong>{{ u.name }}</strong>
        <div class="amt">{{ mask(u.total_earned) }} ETB</div>
        <small>💵 {{ u.withdrawals }}x</small>
      </div>
    </div>

    <ul class="list">
      <li v-for="u in rest" :key="u.id">
        <span class="rank">{{ u.rank }}</span>
        <span class="avatar sm">{{ initial(u) }}</span>
        <div class="meta">
          <strong>{{ u.name }}</strong>
          <small>💵 {{ u.withdrawals }} withdrawals</small>
        </div>
        <span class="amt">{{ mask(u.total_earned) }} ETB</span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getLeaderboard } from '../services/api'
import { fallbackLeaderboard } from '../data/systemAccounts'

const rows = ref(fallbackLeaderboard())
const top3 = computed(() => rows.value.slice(0, 3))
const rest = computed(() => rows.value.slice(3))
const podiumOrder = computed(() => {
  const [a, b, c] = top3.value
  return [b, a, c].filter(Boolean)
})

function initial(uOrName) {
  if (uOrName && typeof uOrName === 'object') {
    return (uOrName.initial || uOrName.name || '?').charAt(0).toUpperCase()
  }
  return (uOrName || '?').charAt(0).toUpperCase()
}

function badge(rank) {
  return rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'
}

function mask(n) {
  const s = String(Math.round(Number(n || 0)))
  if (s.length <= 2) return s
  return s[0] + '***' + s.slice(-2)
}

onMounted(async () => {
  try {
    const data = await getLeaderboard()
    if (Array.isArray(data) && data.length) rows.value = data
  } catch {
    rows.value = fallbackLeaderboard()
  }
})
</script>

<style scoped>
.head {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.trophy {
  width: 3.2rem;
  height: 3.2rem;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  border-radius: 16px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.3);
  box-shadow: 0 8px 20px rgba(251, 191, 36, 0.12);
}

.page-title {
  margin: 0;
}

.page-sub {
  margin: 0.2rem 0 0;
}

.podium {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  gap: 0.55rem;
  align-items: end;
  margin: 1.15rem 0 1.25rem;
}

.seat {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.95rem 0.55rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  box-shadow: var(--shadow-sm);
}

.seat.r1 {
  min-height: 11.5rem;
  background: linear-gradient(180deg, rgba(124, 140, 255, 0.32) 0%, var(--bg-card) 55%);
  border-color: var(--border-strong);
  box-shadow: 0 12px 28px rgba(109, 124, 255, 0.2);
}

.seat.r2,
.seat.r3 {
  min-height: 9.5rem;
}

.badge {
  font-size: 1.1rem;
}

.avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--grad-active);
  font-weight: 800;
  box-shadow: 0 6px 16px rgba(109, 124, 255, 0.35);
}

.seat.r1 .avatar {
  width: 3.4rem;
  height: 3.4rem;
  font-size: 1.05rem;
}

.avatar.sm {
  width: 2.3rem;
  height: 2.3rem;
  font-size: 0.78rem;
}

.amt {
  color: var(--accent-bright);
  font-weight: 800;
}

.list {
  display: grid;
  gap: 0.6rem;
}

.list li {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 0.65rem;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.8rem 0.9rem;
  box-shadow: var(--shadow-sm);
}

.rank {
  width: 1.4rem;
  color: var(--muted);
  font-weight: 800;
  font-size: 0.9rem;
}

.meta strong {
  display: block;
}

.meta small {
  color: var(--muted);
}
</style>

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
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.trophy {
  font-size: 1.8rem;
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
  gap: 0.5rem;
  align-items: end;
  margin: 1.1rem 0 1.2rem;
}

.seat {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 0.9rem 0.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.seat.r1 {
  min-height: 11rem;
  background: linear-gradient(180deg, rgba(109, 124, 255, 0.28), var(--bg-card));
}

.seat.r2,
.seat.r3 {
  min-height: 9.2rem;
}

.avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #4f6bff;
  font-weight: 800;
}

.avatar.sm {
  width: 2.3rem;
  height: 2.3rem;
}

.amt {
  color: #b7c0ff;
  font-weight: 800;
}

.list {
  display: grid;
  gap: 0.55rem;
}

.list li {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 0.65rem;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 0.75rem 0.85rem;
}

.rank {
  width: 1.2rem;
  color: var(--muted);
  font-weight: 700;
}

.meta strong {
  display: block;
}

.meta small {
  color: var(--muted);
}
</style>

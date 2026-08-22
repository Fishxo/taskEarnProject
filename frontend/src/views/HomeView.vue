<template>
  <section class="page home">
    <div class="hero-badge">💎 Skill Money</div>

    <div class="balance-card balance-hero">
      <div class="bal-label">
        <span class="clock">⏱</span>
        ጠቅላላ ቀሪ ሂሳብ
      </div>
      <div class="bal-amount">
        <span class="num">{{ format(balance) }}</span>
        <span class="unit">
          <small>ETB</small>
          <small>Birr</small>
        </span>
      </div>
      <div class="bal-foot">ጠቅላላ ገቢ: {{ format(totalEarned) }} ETB</div>
    </div>

    <h2 class="section-title">የማህበራዊ ተግባራት - 100 ETB ያግኙ</h2>

    <div v-for="task in socialTasks" :key="task.id" class="social-card">
      <div class="social-top">
        <div class="social-icon">💬</div>
        <div class="social-body">
          <strong>{{ task.title_am }}</strong>
          <p>+{{ task.reward_etb }} ETB · {{ task.once_label }}</p>
        </div>
      </div>
      <div class="social-actions">
        <a class="btn open" :href="task.url" target="_blank" rel="noopener">ክፈት ↗</a>
        <button class="btn claim" :disabled="task.claimed || claiming" @click="claimSocial(task)">
          {{ task.claimed ? 'ተቀብሏል' : task.reward_etb + ' ETB ይቀበሉ' }}
        </button>
      </div>
      <p class="hint">መጀመሪያ ቻናሉን ይቀላቀሉ፣ ከዚያ ሽልማቱን ይቀበሉ።</p>
    </div>

    <div class="live-head">
      <span>⚡ የቀጥታ መውጫዎች</span>
      <span class="live-pill"><i class="live-dot"></i> LIVE</span>
    </div>

    <ul class="live-list">
      <li v-for="item in liveFeed" :key="item.id" class="live-item">
        <div class="live-icon">👛</div>
        <div class="live-body">
          <strong>{{ item.name }} ወጪ አድርጓል</strong>
          <small>በ {{ item.method }} · {{ item.ago }}</small>
        </div>
        <div class="live-amt">
          {{ format(item.amount) }} ETB
          <span>Birr</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import { claimSocialTask, getHomeFeed, listSocialTasks } from '../services/api'
import { getSocket } from '../services/socket'
import { fallbackLiveFeed } from '../data/systemAccounts'

const user = inject('user', ref(null))
const refreshUser = inject('refreshUser', async () => {})
const socialTasks = ref([
  {
    id: 1,
    title_am: 'የTelegram ቻናሉን ይቀላቀሉ',
    reward_etb: 100,
    url: 'https://t.me/GetRewardsChannel',
    once_label: 'አንድ ጊዜ ብቻ',
    claimed: false,
  },
])
const liveFeed = ref(fallbackLiveFeed())
const claiming = ref(false)

const balance = computed(
  () => Number(user.value?.balance_main || 0) + Number(user.value?.balance_bonus || 0)
)
const totalEarned = computed(() => Number(user.value?.total_earned || balance.value))

function format(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

async function claimSocial(task) {
  claiming.value = true
  try {
    await claimSocialTask(task.id)
    task.claimed = true
    await refreshUser()
  } catch (e) {
    task.claimed = true
    await refreshUser()
  } finally {
    claiming.value = false
  }
}

async function load() {
  try {
    const [tasks, feed] = await Promise.all([listSocialTasks(), getHomeFeed()])
    if (tasks?.length) socialTasks.value = tasks
    if (feed?.length) liveFeed.value = feed
  } catch {
    liveFeed.value = fallbackLiveFeed()
  }
}

let socket
let socketTimer

onMounted(function () {
  load()
  socketTimer = setTimeout(function () {
    try {
      socket = getSocket()
      socket.on('live_withdrawal', function (item) {
        liveFeed.value = [item].concat(liveFeed.value).slice(0, 20)
      })
    } catch (err) {
      console.error('Socket.IO failed', err)
    }
  }, 500)
})

onUnmounted(function () {
  if (socketTimer) clearTimeout(socketTimer)
  try {
    if (socket) socket.off('live_withdrawal')
  } catch {
    /* ignore */
  }
})
</script>

<style scoped>
.hero-badge {
  display: block;
  width: fit-content;
  margin: 0 auto 0.85rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #dbe2ff;
  background: rgba(124, 140, 255, 0.14);
  border: 1px solid var(--border-strong);
}

.balance-card {
  position: relative;
}

.bal-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.92rem;
  opacity: 0.95;
}

.bal-amount {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 0.6rem 0 0.4rem;
  position: relative;
  z-index: 1;
}

.num {
  font-size: 2.85rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.unit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 0.3rem;
  font-weight: 700;
  line-height: 1.1;
}

.unit small:last-child {
  font-size: 0.72rem;
  opacity: 0.88;
  font-weight: 500;
}

.bal-foot {
  font-size: 0.9rem;
  opacity: 0.92;
  position: relative;
  z-index: 1;
}

.social-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 0.75rem;
  box-shadow: var(--shadow-sm);
}

.social-top {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  align-items: center;
}

.social-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 1.15rem;
  background: rgba(124, 140, 255, 0.18);
  border: 1px solid var(--border-strong);
}

.social-body strong {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.98rem;
}

.social-body p {
  margin: 0;
  color: var(--accent-bright);
  font-size: 0.88rem;
}

.social-actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.55rem;
  margin-top: 0.85rem;
}

.btn {
  border-radius: var(--radius-sm);
  padding: 0.78rem 0.7rem;
  text-align: center;
  font-weight: 700;
}

.btn.open {
  background: rgba(255, 255, 255, 0.92);
  color: #1a1f45;
}

.btn.claim {
  background: rgba(26, 22, 68, 0.55);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn.claim:disabled {
  opacity: 0.5;
}

.hint {
  margin: 0.75rem 0 0;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.live-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.35rem 0 0.75rem;
  font-weight: 700;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--success);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: var(--success-soft);
  border: 1px solid rgba(52, 211, 153, 0.25);
}

.live-list {
  display: grid;
  gap: 0.6rem;
}

.live-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.85rem 0.9rem;
  box-shadow: var(--shadow-sm);
}

.live-icon {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(124, 140, 255, 0.12);
  border: 1px solid var(--border);
}

.live-body strong {
  display: block;
  font-size: 0.92rem;
}

.live-body small {
  color: var(--muted);
}

.live-amt {
  font-weight: 800;
  font-size: 0.92rem;
  text-align: right;
  color: var(--accent-bright);
}

.live-amt span {
  display: block;
  font-size: 0.7rem;
  color: var(--muted);
  font-weight: 500;
}
</style>

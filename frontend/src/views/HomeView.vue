<template>
  <section class="page home">
    <div class="welcome">
      <div class="welcome-icon">🪙</div>
      <div>
        <p class="welcome-tag">Skill Money</p>
        <h1 class="welcome-title">Your Wallet</h1>
      </div>
    </div>

    <div class="balance-card balance-hero">
      <div class="balance-top">
        <div>
          <span class="bal-tag">BALANCE</span>
          <div class="bal-label">ጠቅላላ ቀሪ ሂሳብ</div>
        </div>
        <div class="coin-badge">ETB</div>
      </div>
      <div class="bal-amount">
        <span class="num">{{ format(balance) }}</span>
        <span class="unit">Birr</span>
      </div>
      <div class="bal-foot">
        <span>ጠቅላላ ገቢ</span>
        <strong>{{ format(totalEarned) }} ETB</strong>
      </div>
    </div>

    <h2 class="section-title">Social Tasks · 100 ETB</h2>

    <div v-for="task in socialTasks" :key="task.id" class="social-card">
      <div class="stripe"></div>
      <div class="social-inner">
        <div class="social-top">
          <div class="social-icon">📣</div>
          <div class="social-body">
            <strong>{{ task.title_am }}</strong>
            <p>+{{ task.reward_etb }} ETB · {{ task.once_label }}</p>
          </div>
          <div class="reward-tag">+{{ task.reward_etb }}</div>
        </div>
        <div class="social-actions">
          <a class="btn open" :href="task.url" target="_blank" rel="noopener">ክፈት ↗</a>
          <button class="btn claim" :disabled="task.claimed || claiming" @click="claimSocial(task)">
            {{ task.claimed ? '✓ Received' : 'Claim ETB' }}
          </button>
        </div>
        <p class="hint">መጀመሪያ ቻናሉን ይቀላቀሉ፣ ከዚያ ሽልማቱን ይቀበሉ።</p>
      </div>
    </div>

    <div class="live-head">
      <span class="live-title">⚡ Live Withdrawals</span>
      <span class="live-pill"><i class="live-dot"></i> LIVE</span>
    </div>

    <ul class="live-list">
      <li v-for="item in liveFeed" :key="item.id" class="live-item">
        <div class="live-icon">💰</div>
        <div class="live-body">
          <strong>{{ item.name }}</strong>
          <small>{{ item.method }} · {{ item.ago }}</small>
        </div>
        <div class="live-amt">
          {{ format(item.amount) }}
          <span>ETB</span>
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
.welcome {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.welcome-icon {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  background: var(--gold-soft);
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.welcome-tag {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.welcome-title {
  margin: 0.1rem 0 0;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.balance-card {
  padding: 1.1rem 1.15rem 1rem;
  color: #042f2e;
}

.balance-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
}

.bal-tag {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  opacity: 0.75;
}

.bal-label {
  font-size: 0.88rem;
  font-weight: 600;
  margin-top: 0.15rem;
}

.coin-badge {
  background: rgba(0, 0, 0, 0.2);
  color: #fde047;
  font-weight: 800;
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  letter-spacing: 0.05em;
}

.bal-amount {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0.75rem 0 0.6rem;
  position: relative;
  z-index: 1;
}

.num {
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
}

.unit {
  font-size: 1rem;
  font-weight: 700;
  opacity: 0.8;
}

.bal-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.15);
  font-size: 0.85rem;
  position: relative;
  z-index: 1;
}

.bal-foot strong {
  font-size: 1rem;
}

.social-card {
  display: flex;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 0.75rem;
  box-shadow: var(--shadow-sm);
}

.stripe {
  width: 4px;
  background: var(--grad-gold);
  flex-shrink: 0;
}

.social-inner {
  flex: 1;
  padding: 0.95rem;
}

.social-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
}

.social-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  background: rgba(45, 212, 191, 0.12);
  border: 1px solid var(--border-strong);
}

.social-body strong {
  display: block;
  font-size: 0.92rem;
  margin-bottom: 0.15rem;
}

.social-body p {
  margin: 0;
  color: var(--muted);
  font-size: 0.8rem;
}

.reward-tag {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--gold);
  background: var(--gold-soft);
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
}

.social-actions {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

.btn {
  border-radius: 10px;
  padding: 0.72rem;
  text-align: center;
  font-weight: 700;
  font-size: 0.88rem;
}

.btn.open {
  background: rgba(45, 212, 191, 0.15);
  color: var(--accent-bright);
  border: 1px solid var(--border-strong);
}

.btn.claim {
  background: var(--grad-gold);
  color: #422006;
}

.btn.claim:disabled {
  opacity: 0.5;
}

.hint {
  margin: 0.65rem 0 0;
  color: var(--muted-soft);
  font-size: 0.78rem;
}

.live-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.2rem 0 0.65rem;
}

.live-title {
  font-weight: 700;
  font-size: 0.92rem;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--success);
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  background: var(--success-soft);
  border: 1px solid rgba(52, 211, 153, 0.25);
}

.live-list {
  display: grid;
  gap: 0.5rem;
}

.live-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.65rem;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem 0.85rem;
}

.live-icon {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--gold-soft);
  font-size: 1rem;
}

.live-body strong {
  display: block;
  font-size: 0.88rem;
}

.live-body small {
  color: var(--muted);
  font-size: 0.76rem;
}

.live-amt {
  font-weight: 800;
  font-size: 0.95rem;
  text-align: right;
  color: var(--gold);
}

.live-amt span {
  display: block;
  font-size: 0.68rem;
  color: var(--muted);
  font-weight: 500;
}
</style>

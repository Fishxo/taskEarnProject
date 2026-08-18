<template>
  <section class="page home">
    <h1 class="skill-title">Skill Money</h1>

    <div class="balance-card">
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
      <span class="live-pill"><i></i> LIVE</span>
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
onMounted(() => {
  load()
  try {
    socket = getSocket()
    socket.on('live_withdrawal', (item) => {
      liveFeed.value = [item, ...liveFeed.value].slice(0, 20)
    })
  } catch (err) {
    console.error('Socket.IO failed', err)
  }
})

onUnmounted(() => {
  try {
    if (socket) socket.off('live_withdrawal')
  } catch {
    /* ignore */
  }
})
</script>

<style scoped>
.skill-title {
  margin: 0.15rem 0 0.9rem;
  text-align: center;
  color: #b7c0ff;
  font-size: 1.2rem;
  font-weight: 650;
}
.balance-card {
  background: linear-gradient(135deg, #4f6bff 0%, #7b8cff 45%, #a78bfa 100%);
  border-radius: 22px;
  padding: 1.15rem 1rem 1rem;
  text-align: center;
  box-shadow: 0 16px 40px rgba(79, 107, 255, 0.28);
}
.bal-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.92rem;
}
.bal-amount {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 0.55rem 0 0.35rem;
}
.num {
  font-size: 2.7rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}
.unit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 0.25rem;
  font-weight: 700;
  line-height: 1.1;
}
.unit small:last-child {
  font-size: 0.72rem;
  opacity: 0.85;
  font-weight: 500;
}
.bal-foot { font-size: 0.9rem; }
.section-title {
  margin: 1.25rem 0 0.75rem;
  font-size: 1.02rem;
  font-weight: 700;
}
.social-card {
  background: #161d3a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 0.95rem;
  margin-bottom: 0.75rem;
}
.social-top {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  align-items: center;
}
.social-icon {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(109, 124, 255, 0.18);
}
.social-body strong { display: block; margin-bottom: 0.25rem; }
.social-body p { margin: 0; color: #9eb0ff; font-size: 0.88rem; }
.social-actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.55rem;
  margin-top: 0.85rem;
}
.btn {
  border-radius: 12px;
  padding: 0.75rem 0.7rem;
  text-align: center;
  font-weight: 700;
}
.btn.open { background: #8ea0ff; color: #0d1230; }
.btn.claim { background: #4b3f9a; color: #fff; }
.btn.claim:disabled { opacity: 0.55; }
.hint { margin: 0.7rem 0 0; color: #9aa6c8; font-size: 0.82rem; }
.live-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.2rem 0 0.7rem;
  font-weight: 700;
}
.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #22c55e;
  font-size: 0.78rem;
  font-weight: 800;
}
.live-pill i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: #22c55e;
  display: inline-block;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}
.live-list { display: grid; gap: 0.55rem; }
.live-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  background: #161d3a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 0.8rem 0.85rem;
}
.live-icon {
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.05);
}
.live-body strong { display: block; font-size: 0.92rem; }
.live-body small { color: #9aa6c8; }
.live-amt { font-weight: 800; font-size: 0.92rem; text-align: right; }
.live-amt span {
  display: block;
  font-size: 0.7rem;
  color: #9aa6c8;
  font-weight: 500;
}
</style>

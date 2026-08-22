<template>
  <section class="page">
    <h1 class="page-title">ጋብዝ እና ገቢ ያግኙ</h1>
    <p class="page-sub">ጓደኛዎ ሲመዘገብ {{ inviteReward }} ETB ያግኙ</p>

    <div class="reward-banner">
      <div class="gift">🎁</div>
      <div>
        <small>የግብዣ ሽልማት</small>
        <strong>{{ inviteReward }} ETB</strong>
      </div>
    </div>

    <div class="card box">
      <h2>የእርስዎ የግብዣ ሊንክ</h2>
      <div class="link">{{ inviteUrl }}</div>

      <div class="share-grid">
        <a v-for="s in shares" :key="s.name" class="share" :href="s.href" target="_blank" rel="noopener">
          <span>{{ s.icon }}</span>
          {{ s.name }}
        </a>
      </div>

      <div class="actions">
        <button class="ghost" @click="copy">📋 Copy</button>
        <button class="primary" @click="nativeShare">Share</button>
      </div>
    </div>

    <div class="stats card">
      <div class="stat-icon">👥</div>
      <div>
        <small>የተመዘገቡ ጓደኞች</small>
        <strong>{{ stats.friends }}</strong>
      </div>
      <div class="earned">
        <small>ያገኙት</small>
        <strong>{{ stats.earned }} ETB</strong>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getInviteStats } from '../services/api'

const inviteReward = 100
const stats = ref({ friends: 0, earned: 0, referral_code: '', invite_url: '' })

const inviteUrl = computed(
  () => stats.value.invite_url || 'https://t.me/YourBot/app?startapp=ref_XXXX'
)

const shares = computed(() => {
  const url = encodeURIComponent(inviteUrl.value)
  const text = encodeURIComponent('Join Get Rewards and earn with me!')
  return [
    { name: 'Telegram', icon: '✈️', href: `https://t.me/share/url?url=${url}&text=${text}` },
    { name: 'WhatsApp', icon: '💬', href: `https://wa.me/?text=${text}%20${url}` },
    { name: 'Messenger', icon: '💭', href: `https://www.facebook.com/dialog/send?link=${url}&app_id=0` },
    { name: 'Facebook', icon: '📘', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
  ]
})

async function copy() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    alert('Link copied')
  } catch {
    alert(inviteUrl.value)
  }
}

async function nativeShare() {
  if (navigator.share) {
    await navigator.share({ title: 'Get Rewards', url: inviteUrl.value })
  } else {
    copy()
  }
}

onMounted(async () => {
  try {
    stats.value = await getInviteStats()
  } catch {
    /* keep defaults */
  }
})
</script>

<style scoped>
.reward-banner {
  display: flex;
  align-items: center;
  gap: 0.95rem;
  background: var(--grad-active);
  border-radius: var(--radius-lg);
  padding: 1.15rem 1.05rem;
  margin-bottom: 0.95rem;
  box-shadow: var(--shadow-glow);
  position: relative;
  overflow: hidden;
}

.reward-banner::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.15), transparent 50%);
  pointer-events: none;
}

.gift {
  font-size: 2rem;
  position: relative;
  z-index: 1;
}

.reward-banner small {
  display: block;
  opacity: 0.92;
  position: relative;
  z-index: 1;
}

.reward-banner strong {
  font-size: 1.85rem;
  position: relative;
  z-index: 1;
}

.box {
  padding: 1.05rem;
  margin-bottom: 0.9rem;
}

.box h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 700;
}

.link {
  background: rgba(8, 12, 28, 0.85);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.85rem;
  font-size: 0.78rem;
  word-break: break-all;
  color: #c7d0f5;
  margin-bottom: 0.85rem;
}

.share-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-bottom: 0.8rem;
}

.share {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  justify-content: center;
  padding: 0.78rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  font-weight: 650;
  font-size: 0.88rem;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.share:active {
  background: rgba(124, 140, 255, 0.12);
  border-color: var(--border-strong);
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 0.55rem;
}

.ghost,
.primary {
  border-radius: var(--radius-sm);
  padding: 0.88rem;
  font-weight: 700;
}

.ghost {
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
}

.primary {
  background: var(--grad-active);
  box-shadow: 0 8px 20px rgba(109, 124, 255, 0.35);
}

.stats {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.8rem;
  align-items: center;
  padding: 1rem 1.05rem;
}

.stat-icon {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  background: rgba(124, 140, 255, 0.16);
  border: 1px solid var(--border-strong);
}

.stats small {
  display: block;
  color: var(--muted);
}

.stats strong {
  font-size: 1.3rem;
}

.earned strong {
  color: var(--accent-bright);
}
</style>

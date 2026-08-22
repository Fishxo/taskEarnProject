<template>
  <section class="page">
    <h1 class="page-title gold">ጋብዝ እና ገቢ ያግኙ</h1>
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
  gap: 0.9rem;
  background: linear-gradient(135deg, #134e4a, #0f766e);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 1.1rem 1rem;
  margin-bottom: 0.85rem;
  box-shadow: var(--shadow-glow);
}

.gift { font-size: 2rem; }

.reward-banner small {
  display: block;
  color: var(--accent-bright);
  font-size: 0.78rem;
  font-weight: 600;
}

.reward-banner strong {
  font-size: 1.75rem;
  color: var(--gold);
}

.box {
  padding: 1rem;
  margin-bottom: 0.85rem;
}

.box h2 {
  margin: 0 0 0.7rem;
  font-size: 0.95rem;
}

.link {
  background: #0e1311;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.8rem;
  font-size: 0.76rem;
  word-break: break-all;
  color: var(--accent-bright);
  margin-bottom: 0.8rem;
}

.share-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.share {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
  padding: 0.72rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(45, 212, 191, 0.06);
  font-weight: 650;
  font-size: 0.85rem;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 0.5rem;
}

.ghost, .primary {
  border-radius: var(--radius-sm);
  padding: 0.85rem;
  font-weight: 700;
}

.ghost {
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
}

.primary {
  background: var(--grad-gold);
  color: #422006;
  box-shadow: var(--shadow-gold);
}

.stats {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.95rem 1rem;
}

.stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  background: rgba(45, 212, 191, 0.12);
  border: 1px solid var(--border-strong);
}

.stats small { display: block; color: var(--muted); }
.stats strong { font-size: 1.25rem; }
.earned strong { color: var(--gold); }
</style>

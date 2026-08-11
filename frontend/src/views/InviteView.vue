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
  gap: 0.9rem;
  background: var(--grad-active);
  border-radius: 20px;
  padding: 1.1rem 1rem;
  margin-bottom: 0.9rem;
  box-shadow: 0 14px 30px rgba(109, 124, 255, 0.3);
}

.gift {
  font-size: 1.8rem;
}

.reward-banner small {
  display: block;
  opacity: 0.9;
}

.reward-banner strong {
  font-size: 1.8rem;
}

.box {
  padding: 1rem;
  margin-bottom: 0.85rem;
}

.box h2 {
  margin: 0 0 0.7rem;
  font-size: 1rem;
}

.link {
  background: #0f1430;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem;
  font-size: 0.78rem;
  word-break: break-all;
  color: #c7d0f5;
  margin-bottom: 0.85rem;
}

.share-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
}

.share {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  justify-content: center;
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #121833;
  font-weight: 650;
  font-size: 0.9rem;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 0.55rem;
}

.ghost,
.primary {
  border-radius: 12px;
  padding: 0.85rem;
  font-weight: 700;
}

.ghost {
  border: 1px solid var(--border);
  background: #121833;
}

.primary {
  background: #4f6bff;
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
  background: rgba(109, 124, 255, 0.18);
}

.stats small {
  display: block;
  color: var(--muted);
}

.stats strong {
  font-size: 1.25rem;
}

.earned strong {
  color: #b7c0ff;
}
</style>

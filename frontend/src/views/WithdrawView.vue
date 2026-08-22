<template>
  <section class="page">
    <div class="title-row">
      <div>
        <h1 class="page-title gold">Withdraw</h1>
        <p class="page-sub">ዝቅተኛው {{ minWithdraw.toLocaleString() }} ETB • Ethiopian Birr</p>
      </div>
      <button class="history" @click="showFeedback = !showFeedback">⏱ History</button>
    </div>

    <div class="balance-card balance-hero">
      <div class="wallet">👛</div>
      <small>ያለዎት ቀሪ ሂሳብ</small>
      <strong>{{ format(balance) }} ETB</strong>
    </div>

    <div class="notice">ዝቅተኛው የመውጪ መጠን {{ minWithdraw.toLocaleString() }} ETB ነው።</div>

    <label class="field-label">አገር ይምረጡ</label>
    <button class="country" :class="{ open: countryOpen }" @click="countryOpen = !countryOpen">
      <span>ET Ethiopia</span>
      <span>✓</span>
    </button>

    <div v-if="countryOpen" class="methods">
      <h3>የመውጪ አማራጮች</h3>
      <div class="chips">
        <button
          v-for="m in methods"
          :key="m"
          class="chip"
          :class="{ active: method === m }"
          @click="method = m"
        >
          {{ m }}
        </button>
      </div>

      <label class="field-label">መጠን (ETB)</label>
      <input v-model.number="amount" type="number" min="0" class="input input-field" placeholder="2000" />

      <label class="field-label">ስልክ / አካውንት</label>
      <input v-model="account" class="input input-field" placeholder="09xxxxxxxx" />

      <button class="submit btn-primary" :disabled="submitting" @click="submitWithdraw">
        {{ submitting ? '...' : 'Withdraw request' }}
      </button>
    </div>

    <div class="feedback-head" @click="showFeedback = !showFeedback">
      <span>💬 የማህበረሰብ አስተያየቶች</span>
      <span class="rating">⭐ 4.8 (100)</span>
    </div>
    <p class="feedback-sub">ሙከራቸውን የተቀበሉ ተጠቃሚዎች</p>

    <ul v-if="showFeedback" class="feedback-list">
      <li v-for="f in feedback" :key="f.id" class="feedback-card">
        <div class="f-top">
          <div class="f-user">
            <span class="avatar">{{ initials(f.name) }}</span>
            <div>
              <strong>{{ f.name }}</strong>
              <div class="stars">★★★★★</div>
            </div>
          </div>
          <small>{{ f.ago }}</small>
        </div>
        <p>{{ f.message }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { getCommunityFeedback, requestWithdraw } from '../services/api'
import { fallbackFeedback } from '../data/systemAccounts'

const user = inject('user', ref(null))
const refreshUser = inject('refreshUser', async () => {})

const minWithdraw = 2000
const countryOpen = ref(true)
const showFeedback = ref(true)
const method = ref('Telebirr')
const amount = ref(2000)
const account = ref('')
const submitting = ref(false)
const feedback = ref(fallbackFeedback())

const methods = [
  'Telebirr',
  'CBE Birr',
  'Bank Transfer',
  'M-Pesa Ethiopia',
  'Amole',
  'HelloCash',
  'Commercial Bank of Ethiopia',
  'Dashen Bank',
  'Awash Bank',
  'Bank of Abyssinia',
]

const balance = computed(
  () => Number(user.value?.balance_main || 0) + Number(user.value?.balance_bonus || 0)
)

function format(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function initials(name) {
  return (name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

async function submitWithdraw() {
  if (balance.value < minWithdraw) {
    alert(`ዝቅተኛው ${minWithdraw} ETB ነው።`)
    return
  }
  if (!account.value || !amount.value) {
    alert('መጠን እና አካውንት ያስገቡ')
    return
  }
  submitting.value = true
  try {
    await requestWithdraw({ amount: amount.value, method: method.value, account: account.value })
    await refreshUser()
    alert('Withdraw request sent')
  } catch (e) {
    alert(e.response?.data?.detail || 'Withdraw failed')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const data = await getCommunityFeedback()
    if (Array.isArray(data) && data.length) feedback.value = data
  } catch {
    feedback.value = fallbackFeedback()
  }
})
</script>

<style scoped>
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.history {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.42rem 0.75rem;
  background: rgba(45, 212, 191, 0.08);
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-bright);
}

.balance-card {
  margin-top: 0.75rem;
  padding: 1.1rem 1rem;
  text-align: center;
  color: #042f2e;
}

.wallet { font-size: 1.35rem; }

.balance-card small {
  display: block;
  margin: 0.25rem 0 0.35rem;
  font-weight: 600;
}

.balance-card strong {
  font-size: 2.1rem;
  font-weight: 900;
}

.notice {
  margin: 0.85rem 0;
  background: var(--gold-soft);
  color: var(--gold);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.9rem;
  text-align: center;
  font-size: 0.84rem;
  font-weight: 600;
}

.field-label {
  display: block;
  margin: 0.8rem 0 0.4rem;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.country {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.9rem 1rem;
  font-weight: 700;
}

.country.open {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.12);
}

.methods { margin-top: 0.85rem; }
.methods h3 { margin: 0 0 0.55rem; font-size: 0.92rem; }
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.input { margin-bottom: 0.1rem; }
.submit { width: 100%; margin-top: 0.9rem; color: #042f2e; }

.feedback-head {
  margin-top: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  cursor: pointer;
}

.rating { color: var(--gold); font-size: 0.84rem; }
.feedback-sub { margin: 0.3rem 0 0.75rem; color: var(--muted); font-size: 0.84rem; }
.feedback-list { display: grid; gap: 0.55rem; }

.feedback-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-md);
  padding: 0.85rem;
}

.f-top {
  display: flex;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.45rem;
}

.f-user {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--grad-gold);
  color: #422006;
  font-weight: 800;
  font-size: 0.75rem;
}

.stars { color: var(--gold); font-size: 0.74rem; letter-spacing: 0.05em; }
.feedback-card p { margin: 0; color: #c8d4cf; line-height: 1.45; font-size: 0.88rem; }
.feedback-card small { color: var(--muted); }
</style>

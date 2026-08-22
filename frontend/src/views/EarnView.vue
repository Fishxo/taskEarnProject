<template>
  <section class="page earn">
    <div class="title-row">
      <h1 class="page-title">ተግባራት</h1>
    </div>

    <div class="grid">
      <button
        v-for="task in tasks"
        :key="task.id"
        class="task"
        :class="{
          active: task.status === 'available',
          locked: task.status === 'locked',
          done: task.status === 'completed',
        }"
        :disabled="task.status === 'locked' || completing"
        @click="onTask(task)"
      >
        <span class="num">#{{ task.order_index }}</span>
        <span class="glyph" aria-hidden="true">
          <svg v-if="task.status === 'locked'" viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
            <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm3 9.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z"/>
          </svg>
          <svg v-else-if="task.status === 'completed'" viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
            <path d="M9.2 16.6 4.8 12.2l1.4-1.4 3 3 8.6-8.6 1.4 1.4-10 10Z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
            <path d="M8 5.5v13l11-6.5L8 5.5Z"/>
          </svg>
        </span>
        <span class="label">{{ label(task) }}</span>
        <span v-if="task.status === 'available'" class="reward">+{{ task.reward_etb }} ETB</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { inject, onMounted, ref } from 'vue'
import { completeEarnTask, listEarnTasks } from '../services/api'
import { FALLBACK_EARN_TASKS } from '../data/systemAccounts'

const refreshUser = inject('refreshUser', async () => {})
const tasks = ref([...FALLBACK_EARN_TASKS])
const completing = ref(false)

function label(task) {
  if (task.status === 'locked') return 'ተቆልፏል'
  if (task.status === 'completed') return 'ተጠናቋል'
  return task.title_am || 'Ad ይመልከቱ'
}

async function onTask(task) {
  if (task.status !== 'available') return
  completing.value = true
  try {
    await completeEarnTask(task.id)
    await load()
    await refreshUser()
  } catch (e) {
    // local fallback progress if API fails
    const idx = tasks.value.findIndex((t) => t.id === task.id)
    if (idx >= 0) {
      tasks.value[idx] = { ...tasks.value[idx], status: 'completed' }
      if (tasks.value[idx + 1] && tasks.value[idx + 1].status === 'locked') {
        tasks.value[idx + 1] = { ...tasks.value[idx + 1], status: 'available' }
      }
      await refreshUser()
    } else {
      alert(e.response?.data?.detail || 'Task failed')
    }
  } finally {
    completing.value = false
  }
}

async function load() {
  try {
    const data = await listEarnTasks()
    if (Array.isArray(data) && data.length) tasks.value = data
  } catch {
    if (!tasks.value.length) tasks.value = [...FALLBACK_EARN_TASKS]
  }
}

onMounted(load)
</script>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  margin-top: 0.85rem;
}

.task {
  position: relative;
  min-height: 9.75rem;
  border-radius: var(--radius-lg);
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: #d7ddf8;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.task.active {
  background: var(--grad-active);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 14px 32px rgba(109, 124, 255, 0.42);
}

.task.locked {
  opacity: 0.72;
  background: rgba(14, 18, 36, 0.85);
}

.task.done {
  background: rgba(26, 39, 72, 0.9);
  border-color: rgba(52, 211, 153, 0.2);
}

.num {
  position: absolute;
  top: 0.75rem;
  left: 0.85rem;
  font-size: 0.82rem;
  font-weight: 800;
  opacity: 0.85;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.15);
}

.task.active .num {
  background: rgba(255, 255, 255, 0.15);
}

.glyph {
  display: grid;
  place-items: center;
  margin-top: 0.35rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.task.active .glyph {
  background: rgba(255, 255, 255, 0.14);
}

.label {
  font-weight: 750;
  font-size: 0.96rem;
  text-align: center;
}

.reward {
  font-size: 0.78rem;
  opacity: 0.95;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}
</style>

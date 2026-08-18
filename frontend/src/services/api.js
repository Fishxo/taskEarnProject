import axios from 'axios'

const TOKEN_KEY = 'gr_token'

function storageGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* Telegram WebView can block storage */
  }
}

function storageRemove(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = storageGet(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function setToken(token) {
  if (token) storageSet(TOKEN_KEY, token)
  else storageRemove(TOKEN_KEY)
}

export async function registerTelegram(initData, startParam = '') {
  const payload = {
    initData: initData || undefined,
    start_param: startParam || undefined,
  }
  const { data } = await api.post('/auth/telegram', payload)
  if (data && data.token) setToken(data.token)
  return data
}

export async function getMe() {
  const { data } = await api.get('/me')
  return data
}

export async function listSocialTasks() {
  const { data } = await api.get('/tasks/social')
  return data
}

export async function claimSocialTask(id) {
  const { data } = await api.post(`/tasks/social/${id}/claim`)
  return data
}

export async function listEarnTasks() {
  const { data } = await api.get('/tasks/earn')
  return data
}

export async function completeEarnTask(id) {
  const { data } = await api.post(`/tasks/earn/${id}/complete`)
  return data
}

export async function getHomeFeed() {
  const { data } = await api.get('/feed/withdrawals')
  return data
}

export async function getLeaderboard() {
  const { data } = await api.get('/leaderboard')
  return data
}

export async function getInviteStats() {
  const { data } = await api.get('/invite')
  return data
}

export async function requestWithdraw(payload) {
  const { data } = await api.post('/withdrawals', payload)
  return data
}

export async function getCommunityFeedback() {
  const { data } = await api.get('/feedback')
  return data
}

export async function getAdminStats() {
  const { data } = await api.get('/admin/stats')
  return data
}

export async function getAdminDashboard() {
  const { data } = await api.get('/admin/dashboard')
  return data
}

export async function listAdminUsers() {
  const { data } = await api.get('/admin/users')
  return data
}

export async function listAdminWithdrawals(status = 'pending') {
  const { data } = await api.get('/admin/withdrawals', { params: { status } })
  return data
}

export async function reviewWithdrawal(id, status) {
  const { data } = await api.post(`/admin/withdrawals/${id}/review`, { status })
  return data
}

export async function reviewAdminDeposit(id, status) {
  const { data } = await api.post(`/admin/deposits/${id}/review`, { status })
  return data
}

export async function searchAdminUser(q) {
  const { data } = await api.get('/admin/users/search', { params: { q } })
  return data
}

export async function updateUserBalance(id, payload) {
  const { data } = await api.patch(`/admin/users/${id}/balance`, payload)
  return data
}

export async function saveAdminSettings(payload) {
  const { data } = await api.put('/admin/settings', payload)
  return data
}

export async function sendAdminBroadcast(payload) {
  const { data } = await api.post('/admin/broadcast', payload)
  return data
}

export async function sendAdminDm(payload) {
  const { data } = await api.post('/admin/dm', payload)
  return data
}

export async function saveSecondAdminCredentials(payload) {
  const { data } = await api.put('/admin/second-admin', payload)
  return data
}

export default api

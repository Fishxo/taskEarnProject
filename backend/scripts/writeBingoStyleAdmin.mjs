import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const out = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/src/views/AdminDashboard.vue'
);

const vue = `<template>
  <div class="dash">
    <header class="dash-head">
      <div class="title-wrap">
        <h1>Admin Dashboard</h1>
        <span class="updated">Last updated: {{ lastUpdated }}</span>
      </div>
      <div class="head-actions">
        <router-link class="btn blue" to="/home">App</router-link>
        <button class="btn purple" @click="refreshAll">Refresh</button>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <!-- Statistics -->
    <section class="card">
      <h2>Statistics</h2>
      <div class="two-col">
        <div class="sub green">
          <h3>Tasks Completed</h3>
          <ul>
            <li><span>Today</span><b>{{ stats.tasks.today }}</b></li>
            <li><span>Yesterday</span><b>{{ stats.tasks.yesterday }}</b></li>
            <li><span>This Week</span><b>{{ stats.tasks.week }}</b></li>
            <li><span>Last Week</span><b>{{ stats.tasks.last_week }}</b></li>
            <li><span>This Month</span><b>{{ stats.tasks.month }}</b></li>
            <li><span>Last Month</span><b>{{ stats.tasks.last_month }}</b></li>
            <li class="total"><span>Total</span><b>{{ stats.tasks.total }}</b></li>
          </ul>
        </div>
        <div class="sub orange">
          <h3>Revenue</h3>
          <ul>
            <li><span>Today</span><b>{{ money(stats.revenue.today) }}</b></li>
            <li><span>Yesterday</span><b>{{ money(stats.revenue.yesterday) }}</b></li>
            <li><span>This Week</span><b>{{ money(stats.revenue.week) }}</b></li>
            <li><span>Last Week</span><b>{{ money(stats.revenue.last_week) }}</b></li>
            <li><span>This Month</span><b>{{ money(stats.revenue.month) }}</b></li>
            <li><span>Last Month</span><b>{{ money(stats.revenue.last_month) }}</b></li>
            <li class="total"><span>Total</span><b>{{ money(stats.revenue.total) }}</b></li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Earn mode -->
    <section class="card">
      <h2>Earn Mode</h2>
      <div class="three-col">
        <div class="mini blue"><span>Social Claims</span><strong>{{ stats.mode.social }}</strong></div>
        <div class="mini orange"><span>Ad Tasks</span><strong>{{ stats.mode.ads }}</strong></div>
        <div class="mini purple"><span>Total Users</span><strong>{{ stats.mode.users }}</strong></div>
      </div>
    </section>

    <!-- Financial -->
    <section class="card">
      <h2>Financial</h2>
      <div class="three-col">
        <div class="mini green"><span>Total Deposits</span><strong>{{ money(stats.finance.deposits) }}</strong></div>
        <div class="mini red"><span>Total Withdrawals</span><strong>{{ money(stats.finance.withdrawals) }}</strong></div>
        <div class="mini blue"><span>Total Balance</span><strong>{{ money(stats.finance.balance) }}</strong></div>
      </div>
    </section>

    <!-- Search user -->
    <section class="card">
      <h2>Search User</h2>
      <p class="hint">Search by phone, @username, or User ID. After search, use Edit balance / actions.</p>
      <div class="search-row">
        <input v-model="userQuery" placeholder="Phone, @username, or User ID" />
        <button class="btn green" @click="searchUser">Search</button>
      </div>
      <div v-if="userResult" class="user-result">
        <div><b>#{{ userResult.id }}</b> {{ displayName(userResult) }} · TG {{ userResult.telegram_id }}</div>
        <div>Balance: {{ money(userResult.balance_total) }} · Earned: {{ money(userResult.total_earned) }}</div>
        <div class="edit-row">
          <input v-model.number="editBonus" type="number" placeholder="Bonus balance" />
          <input v-model.number="editMain" type="number" placeholder="Main balance" />
          <button class="btn green" @click="saveBalance">Edit balance</button>
        </div>
      </div>
    </section>

    <!-- Search transaction -->
    <section class="card">
      <h2>Search Transaction Number</h2>
      <p class="hint">CBE: FT... or Telebirr ref. Example formats from receipt SMS.</p>
      <div class="search-row">
        <input v-model="txQuery" placeholder="CBE: FT... or Telebirr ref" />
        <button class="btn green" @click="searchTx">Search</button>
      </div>
      <p v-if="txResultMsg" class="hint">{{ txResultMsg }}</p>
    </section>

    <!-- Deposits & Withdrawals -->
    <section class="card">
      <div class="card-head">
        <h2>Deposits & Withdrawals</h2>
        <button class="btn blue sm" @click="refreshMoney">Refresh</button>
      </div>

      <h3>Pending Deposits</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Amount</th><th>Platform</th><th>Text</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-if="!pendingDeposits.length"><td colspan="7" class="empty">No pending deposits</td></tr>
            <tr v-for="d in pendingDeposits" :key="'pd'+d.id">
              <td>{{ d.id }}</td><td>{{ d.user_name }}</td><td>{{ money(d.amount) }}</td>
              <td>{{ d.platform }}</td><td>{{ d.text || '-' }}</td><td>{{ d.created_label }}</td>
              <td class="acts">
                <button class="btn green sm" @click="reviewDeposit(d.id, 'approved')">Approve</button>
                <button class="btn red sm" @click="reviewDeposit(d.id, 'rejected')">Reject</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Failed Deposit Requests</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Amount</th><th>Platform</th><th>Reason</th><th>Ref</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-if="!failedDeposits.length"><td colspan="8" class="empty">No failed deposits</td></tr>
            <tr v-for="d in failedDeposits" :key="'fd'+d.id">
              <td>{{ d.id }}</td><td>{{ d.user_name }}</td><td>{{ money(d.amount) }}</td>
              <td>{{ d.platform }}</td><td>{{ d.reason || '-' }}</td><td>{{ d.ref || '-' }}</td><td>{{ d.created_label }}</td>
              <td class="acts">
                <button class="btn green sm" @click="reviewDeposit(d.id, 'approved')">Approve</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Approved Deposits</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Amount</th><th>Platform</th><th>Text</th><th>Created</th></tr>
          </thead>
          <tbody>
            <tr v-if="!approvedDeposits.length"><td colspan="6" class="empty">No approved deposits</td></tr>
            <tr v-for="d in approvedDeposits" :key="'ad'+d.id">
              <td>{{ d.id }}</td><td>{{ d.user_name }}</td><td>{{ money(d.amount) }}</td>
              <td>{{ d.platform }}</td><td>{{ d.text || '-' }}</td><td>{{ d.created_label }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Pending Withdraws</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Amount</th><th>Platform</th><th>Account Name</th><th>Account #</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-if="!pendingWithdraws.length"><td colspan="8" class="empty">No pending withdraws</td></tr>
            <tr v-for="w in pendingWithdraws" :key="'pw'+w.id">
              <td>{{ w.id }}</td><td>{{ w.user_name }}</td><td>{{ money(w.amount) }}</td>
              <td>{{ w.method }}</td><td>{{ w.user_name }}</td><td>{{ w.account }}</td><td>{{ w.created_label }}</td>
              <td class="acts">
                <button class="btn green sm" @click="decide(w.id, 'paid')">Approve</button>
                <button class="btn red sm" @click="decide(w.id, 'rejected')">Reject</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Approved Withdraws</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Amount</th><th>Platform</th><th>Account Name</th><th>Created</th></tr>
          </thead>
          <tbody>
            <tr v-if="!approvedWithdraws.length"><td colspan="6" class="empty">No approved withdraws</td></tr>
            <tr v-for="w in approvedWithdraws" :key="'aw'+w.id">
              <td>{{ w.id }}</td><td>{{ w.user_name }}</td><td>{{ money(w.amount) }}</td>
              <td>{{ w.method }}</td><td>{{ w.user_name }}</td><td>{{ w.created_label }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Registered users -->
    <section class="card">
      <div class="card-head">
        <h2>Registered Users</h2>
        <div class="sort-row">
          <label>Sort by:</label>
          <select v-model="userSort">
            <option value="newest">Joined (newest)</option>
            <option value="oldest">Joined (oldest)</option>
            <option value="balance">Balance</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Username</th><th>Telegram ID</th><th>Phone</th><th>Name</th>
              <th>Bonus</th><th>Main</th><th>Earned</th><th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!sortedUsers.length"><td colspan="10" class="empty">No registered users yet</td></tr>
            <tr v-for="u in sortedUsers" :key="u.id">
              <td>{{ u.id }}</td>
              <td>{{ u.username || '-' }}</td>
              <td>{{ u.telegram_id }}</td>
              <td>{{ u.phone_number || '-' }}</td>
              <td>{{ displayName(u) }}</td>
              <td>{{ money(u.balance_bonus) }}</td>
              <td>{{ money(u.balance_main) }}</td>
              <td>{{ money(u.total_earned) }}</td>
              <td>{{ formatDate(u.created_at) }}</td>
              <td><button class="btn blue sm" @click="focusUser(u)">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Deposit accounts -->
    <section class="card">
      <h2>Deposit Account Information</h2>
      <div class="grid-3">
        <label>Telebirr - Account Holder<input v-model="settings.telebirr_name" /></label>
        <label>Telebirr - Account Number<input v-model="settings.telebirr_number" /></label>
        <label>CBE - Account Holder<input v-model="settings.cbe_name" /></label>
        <label>CBE - Account Number<input v-model="settings.cbe_number" /></label>
        <label>BOA - Account Holder<input v-model="settings.boa_name" /></label>
        <label>BOA - Account Number<input v-model="settings.boa_number" /></label>
      </div>
      <div class="grid-2" style="margin-top:1rem">
        <div>
          <label>Telebirr Verify API Key
            <input v-model="settings.telebirr_verify_api_key" placeholder="API key for auto-verify (optional)" />
          </label>
          <p class="hint">When set, Telebirr deposits can be verified automatically from receipt text.</p>
        </div>
        <div class="check-block">
          <label class="check"><input type="checkbox" v-model="settings.cbe_use_proxy" /> CBE use fallback proxy (server outside Ethiopia)</label>
          <p class="hint">Enable if your server is outside Ethiopia (e.g. AWS).</p>
        </div>
      </div>
      <button class="btn green" style="margin-top:1rem" @click="saveSettings">Save Settings</button>
    </section>

    <!-- Broadcast -->
    <section class="card">
      <h2>Broadcast Message</h2>
      <label>Send to:
        <select v-model="broadcast.to">
          <option value="all">Broadcast (all users)</option>
          <option value="admins">Admins only</option>
        </select>
      </label>
      <label>Message:<textarea v-model="broadcast.message" placeholder="Enter message..." rows="4"></textarea></label>
      <label>Amount to Add (optional, 0 for message only):
        <input v-model.number="broadcast.amount" type="number" />
      </label>
      <button class="btn green" @click="sendBroadcast">Send Message</button>
    </section>

    <section class="card">
      <h2>Send Telegram Message to Individual User</h2>
      <label>Phone Number or User ID:<input v-model="dm.target" placeholder="0912345678 or 123" /></label>
      <label>Message:<textarea v-model="dm.message" placeholder="Enter message..." rows="3"></textarea></label>
      <button class="btn green" @click="sendDm">Send to User</button>
    </section>

    <section class="card">
      <h2>Recent Broadcast Messages</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Message</th><th>Amount</th><th>Sent By</th><th>Recipients</th><th>Date</th></tr>
          </thead>
          <tbody>
            <tr v-if="!broadcasts.length"><td colspan="6" class="empty">No broadcast messages yet</td></tr>
            <tr v-for="b in broadcasts" :key="b.id">
              <td>{{ b.id }}</td><td>{{ b.message }}</td><td>{{ money(b.amount) }}</td>
              <td>{{ b.sent_by }}</td><td>{{ b.recipients }}</td><td>{{ formatDate(b.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Second admin -->
    <section class="card">
      <h2>Second Admin Credentials</h2>
      <div class="second-admin">
        <label>Username:<input v-model="secondAdmin.username" /></label>
        <label>Password (leave empty to keep current):
          <input v-model="secondAdmin.password" type="password" placeholder="Leave empty to keep current" />
        </label>
        <button class="btn blue" @click="saveSecondAdmin">Save Credentials</button>
        <p class="hint">Used to access dashboard at /secondadmin — enter both username and password when creating or changing login.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getAdminDashboard,
  listAdminUsers,
  listAdminWithdrawals,
  reviewWithdrawal,
  reviewDeposit,
  searchAdminUser,
  updateUserBalance,
  saveAdminSettings,
  sendAdminBroadcast,
  sendAdminDm,
  saveSecondAdminCredentials,
} from '../services/api'

const error = ref('')
const lastUpdated = ref(new Date().toLocaleString())
const userQuery = ref('')
const userResult = ref(null)
const editMain = ref(0)
const editBonus = ref(0)
const txQuery = ref('')
const txResultMsg = ref('')
const userSort = ref('newest')
const users = ref([])
const pendingDeposits = ref([])
const failedDeposits = ref([])
const approvedDeposits = ref([])
const pendingWithdraws = ref([])
const approvedWithdraws = ref([])
const broadcasts = ref([])

const stats = reactive({
  tasks: { today: 0, yesterday: 0, week: 0, last_week: 0, month: 0, last_month: 0, total: 0 },
  revenue: { today: 0, yesterday: 0, week: 0, last_week: 0, month: 0, last_month: 0, total: 0 },
  mode: { social: 0, ads: 0, users: 0 },
  finance: { deposits: 0, withdrawals: 0, balance: 0 },
})

const settings = reactive({
  telebirr_name: '',
  telebirr_number: '',
  cbe_name: '',
  cbe_number: '',
  boa_name: '',
  boa_number: '',
  telebirr_verify_api_key: '',
  cbe_use_proxy: false,
})

const broadcast = reactive({ to: 'all', message: '', amount: 0 })
const dm = reactive({ target: '', message: '' })
const secondAdmin = reactive({ username: '', password: '' })

const sortedUsers = computed(() => {
  const list = [...users.value]
  if (userSort.value === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  else if (userSort.value === 'balance') list.sort((a, b) => (b.balance_total || 0) - (a.balance_total || 0))
  else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return list
})

function money(n) {
  return 'ETB ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function displayName(u) {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || ('#' + u.id)
}
function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString()
}
function touch() {
  lastUpdated.value = new Date().toLocaleString()
}

async function refreshAll() {
  error.value = ''
  try {
    const data = await getAdminDashboard()
    Object.assign(stats.tasks, data.stats.tasks || {})
    Object.assign(stats.revenue, data.stats.revenue || {})
    Object.assign(stats.mode, data.stats.mode || {})
    Object.assign(stats.finance, data.stats.finance || {})
    Object.assign(settings, data.settings || {})
    pendingDeposits.value = data.deposits?.pending || []
    failedDeposits.value = data.deposits?.failed || []
    approvedDeposits.value = data.deposits?.approved || []
    pendingWithdraws.value = data.withdrawals?.pending || []
    approvedWithdraws.value = data.withdrawals?.paid || []
    users.value = data.users || []
    broadcasts.value = data.broadcasts || []
    if (data.second_admin?.username) secondAdmin.username = data.second_admin.username
    touch()
  } catch (e) {
    error.value = e.response?.data?.detail || 'Admin access required'
  }
}

async function refreshMoney() {
  await refreshAll()
}

async function decide(id, status) {
  await reviewWithdrawal(id, status)
  await refreshAll()
}

async function reviewDeposit(id, status) {
  await reviewDeposit(id, status)
  await refreshAll()
}

async function searchUser() {
  try {
    userResult.value = await searchAdminUser(userQuery.value)
    editMain.value = userResult.value.balance_main
    editBonus.value = userResult.value.balance_bonus
  } catch (e) {
    userResult.value = null
    error.value = e.response?.data?.detail || 'User not found'
  }
}

function focusUser(u) {
  userResult.value = u
  userQuery.value = String(u.id)
  editMain.value = u.balance_main
  editBonus.value = u.balance_bonus
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function saveBalance() {
  if (!userResult.value) return
  await updateUserBalance(userResult.value.id, { balance_main: editMain.value, balance_bonus: editBonus.value })
  await refreshAll()
  await searchUser()
}

async function searchTx() {
  txResultMsg.value = txQuery.value
    ? 'No matching transaction for "' + txQuery.value + '" (wire verify API later).'
    : 'Enter a transaction reference.'
}

async function saveSettings() {
  await saveAdminSettings({ ...settings })
  alert('Settings saved')
}

async function sendBroadcast() {
  await sendAdminBroadcast({ ...broadcast })
  broadcast.message = ''
  broadcast.amount = 0
  await refreshAll()
  alert('Broadcast queued')
}

async function sendDm() {
  await sendAdminDm({ ...dm })
  dm.message = ''
  alert('Message queued')
}

async function saveSecondAdmin() {
  await saveSecondAdminCredentials({ ...secondAdmin })
  secondAdmin.password = ''
  alert('Second admin saved')
}

onMounted(refreshAll)
</script>

<style scoped>
.dash {
  min-height: 100vh;
  background: #d8c9ef;
  color: #1e2a44;
  padding: 1.25rem;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.dash-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.title-wrap h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #1a2744;
}
.updated {
  display: inline-block;
  margin-top: 0.35rem;
  color: #6b7280;
  font-size: 0.9rem;
}
.head-actions { display: flex; gap: 0.5rem; }
.card {
  background: #fff;
  border-radius: 14px;
  padding: 1.1rem 1.2rem 1.25rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 10px rgba(40, 20, 70, 0.08);
}
.card h2 {
  margin: 0 0 0.9rem;
  font-size: 1.15rem;
  color: #243352;
}
.card h3 {
  margin: 1.1rem 0 0.55rem;
  font-size: 1rem;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}
.three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.sub {
  border-radius: 10px;
  padding: 0.85rem 1rem;
  border-left: 5px solid;
}
.sub.green { background: #eaf8ef; border-color: #2e7d32; }
.sub.orange { background: #fff3e8; border-color: #e67e22; }
.sub h3 { margin: 0 0 0.55rem; }
.sub ul { list-style: none; margin: 0; padding: 0; }
.sub li {
  display: flex;
  justify-content: space-between;
  padding: 0.2rem 0;
  color: #374151;
}
.sub li.total { color: #2e7d32; font-weight: 700; }
.mini {
  border-radius: 10px;
  padding: 0.9rem;
  border-left: 5px solid;
}
.mini span { display: block; color: #4b5563; margin-bottom: 0.35rem; }
.mini strong { font-size: 1.35rem; }
.mini.green { background: #eaf8ef; border-color: #2e7d32; }
.mini.orange { background: #fff3e8; border-color: #e67e22; }
.mini.blue { background: #e8f1ff; border-color: #2563eb; }
.mini.purple { background: #f3e8ff; border-color: #7c3aed; }
.mini.red { background: #fde8ec; border-color: #dc2626; }
.hint { color: #6b7280; font-size: 0.9rem; }
.search-row, .edit-row {
  display: flex;
  gap: 0.55rem;
  margin-top: 0.55rem;
}
input, select, textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  font: inherit;
  background: #fff;
}
textarea { resize: vertical; }
label {
  display: block;
  font-weight: 650;
  margin: 0.55rem 0;
  color: #243352;
}
label input, label select, label textarea { margin-top: 0.35rem; font-weight: 500; }
.btn {
  border: 0;
  border-radius: 8px;
  padding: 0.65rem 1rem;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.btn.sm { padding: 0.35rem 0.6rem; font-size: 0.82rem; }
.btn.green { background: #2f9e5d; }
.btn.blue { background: #3498db; }
.btn.purple { background: #6c3fc9; }
.btn.red { background: #dc3545; }
.table-wrap { overflow-x: auto; margin-bottom: 0.5rem; }
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}
th {
  background: #5b2c71;
  color: #fff;
  text-align: left;
  padding: 0.65rem 0.55rem;
  font-size: 0.85rem;
}
td {
  padding: 0.6rem 0.55rem;
  border-bottom: 1px solid #eee;
  font-size: 0.88rem;
  background: #fff;
}
td.empty {
  text-align: center;
  color: #9ca3af;
  font-style: italic;
}
.acts { display: flex; gap: 0.35rem; }
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.check-block { padding-top: 0.4rem; }
.check { font-weight: 650; display: flex; gap: 0.45rem; align-items: flex-start; }
.second-admin { max-width: 360px; }
.user-result {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f8f5ff;
  border-radius: 10px;
}
.error { color: #b91c1c; font-weight: 650; }
.sort-row { display: flex; gap: 0.45rem; align-items: center; }
@media (max-width: 900px) {
  .two-col, .three-col, .grid-3, .grid-2 { grid-template-columns: 1fr; }
  .dash-head { flex-direction: column; }
}
</style>
`;

fs.writeFileSync(out, vue, 'utf8');
console.log('wrote', out);

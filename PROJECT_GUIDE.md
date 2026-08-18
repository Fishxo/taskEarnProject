# Get Rewards — Project Guide

Telegram Mini App (like SkillEarn): earn via tasks, invite friends, withdraw ETB.

| Part | Role |
|------|------|
| **Telegram bot** | `/start`, open Mini App, `/balance` |
| **Vue frontend** | Home · Earn · Top · Invite · Withdraw |
| **Express backend** | Auth, tasks, invites, withdrawals, live feed |
| **PostgreSQL** | Users, tasks, withdrawals |
| **Redis** | Optional cache |
| **Nginx + systemd** | Same EC2 style as bingo |

**Server path:** `/home/ubuntu/taskEarnProject`

---

## Screens

1. **Home (መነሻ)** — balance card, social task (join channel), live withdrawals feed  
2. **Earn** — numbered task grid (watch ads); unlock in order  
3. **Top** — leaderboard podium + list  
4. **Invite (ጋብዝ)** — referral link, share buttons, friends / earned stats  
5. **Withdraw** — min 2000 ETB, Ethiopia methods, community feedback  

---

## Local run

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev

# other terminal
npm run bot

cd ../frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## EC2 update (after git pull)

```bash
cd ~/taskEarnProject/backend && npm install && npm run migrate
cd ~/taskEarnProject/frontend && npm install && npm run build
sudo systemctl restart get-rewards-api get-rewards-telegram-bot
```

See `nginx/` and `systemd/` for first-time server setup.

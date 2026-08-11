# Get Rewards

Telegram Mini App to **earn ETB** from tasks, invites, and social actions — then withdraw.

Not a bingo clone. Same deploy style as bingo: **AWS EC2 + nginx + systemd**.

## App tabs

| Tab | What it does |
|-----|----------------|
| Home | Balance, join Telegram channel task, live withdrawals |
| Earn | Watch-ad / task grid (unlock in order) |
| Top | Leaderboard |
| Invite | Referral link + friend stats |
| Withdraw | Ethiopia payout methods + community feedback |

## Stack

- **Vue 3 + Vite** frontend  
- **Express.js** API + Socket.IO  
- **Telegraf** Telegram bot  
- **PostgreSQL** (+ Redis optional)

## Local

```bash
cd backend && cp .env.example .env && npm install && npm run migrate && npm run dev
cd frontend && npm install && npm run dev
```

Full EC2 steps: [PROJECT_GUIDE.md](./PROJECT_GUIDE.md)

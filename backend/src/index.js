import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { config } from './config.js';
import { getRedis } from './db/redis.js';
import { setIo } from './realtime.js';

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
  path: '/socket.io',
});
setIo(io);

io.on('connection', (socket) => {
  socket.emit('hello', { service: 'get-rewards', ts: Date.now() });
  socket.on('ping', () => socket.emit('pong', { ts: Date.now() }));
});

async function start() {
  if (!config.demoMode) {
    try {
      const redis = getRedis();
      await redis.connect();
      console.log('Redis connected');
    } catch (err) {
      console.warn('Redis not available yet:', err.message);
    }
  }

  server.listen(config.port, config.host, () => {
    console.log(`Get Rewards API listening on http://${config.host}:${config.port}`);
  });
}

start();

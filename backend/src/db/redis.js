import Redis from 'ioredis';
import { config } from '../config.js';

let redis;

export function getRedis() {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redis;
}

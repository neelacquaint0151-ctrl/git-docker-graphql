import Redis from 'ioredis';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

export const redisOptions = {
  host: redisHost,
  port: Number(redisPort),
  family: 4,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
};

export const redis = new Redis(redisOptions);

const publisher = new Redis(redisOptions);
const subscriber = new Redis(redisOptions);

redis.on('connect', () => console.log('⚡ Connected to Redis successfully!'));

redis.on('error', (err) => console.error('Redis error:', err.message));
publisher.on('error', (err) => console.error('[Redis Publisher Error]', err.message));
subscriber.on('error', (err) => console.error('[Redis Subscriber Error]', err.message));

export const pubsub = new RedisPubSub({
  publisher,
  subscriber,
});

redis.on('connect', () => console.log('⚡ Connected to Redis successfully!'));
redis.on('error', (err) => console.error('Redis error:', err.message));
const Redis = require('ioredis');

// Determine if we're running in distributed mode (Redis available)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DISTRIBUTED_MODE = process.env.DISTRIBUTED_MODE === 'true';

let redis = null;
let subscriber = null;

/**
 * Get the shared Redis client (for commands).
 * Returns null if not in distributed mode.
 */
const getRedisClient = () => {
    if (!DISTRIBUTED_MODE) return null;

    if (!redis) {
        redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 200, 5000);
                return delay;
            },
            lazyConnect: false,
        });

        redis.on('connect', () => console.log('[Redis] Connected'));
        redis.on('error', (err) => console.error('[Redis] Error:', err.message));
    }

    return redis;
};

/**
 * Get a separate Redis client for Pub/Sub subscriptions.
 * The subscriber client is dedicated — once it subscribes to a channel,
 * it cannot be used for regular commands.
 */
const getSubscriber = () => {
    if (!DISTRIBUTED_MODE) return null;

    if (!subscriber) {
        subscriber = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 200, 5000);
                return delay;
            },
        });

        subscriber.on('connect', () => console.log('[Redis Subscriber] Connected'));
        subscriber.on('error', (err) => console.error('[Redis Subscriber] Error:', err.message));
    }

    return subscriber;
};

/**
 * Cache helper — get or set with TTL.
 */
const cacheGet = async (key) => {
    const client = getRedisClient();
    if (!client) return null;
    try {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error('[Redis] Cache get error:', err.message);
        return null;
    }
};

const cacheSet = async (key, value, ttlSeconds = 300) => {
    const client = getRedisClient();
    if (!client) return;
    try {
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
        console.error('[Redis] Cache set error:', err.message);
    }
};

const cacheDel = async (key) => {
    const client = getRedisClient();
    if (!client) return;
    try {
        await client.del(key);
    } catch (err) {
        console.error('[Redis] Cache del error:', err.message);
    }
};

const blacklistToken = async (token, ttlSeconds) => {
    const client = getRedisClient();
    if (!client) return;
    try {
        await client.set(`blacklist:${token}`, '1', 'EX', ttlSeconds);
    } catch (err) {
        console.error('[Redis] Token blacklist error:', err.message);
    }
};

const isTokenBlacklisted = async (token) => {
    const client = getRedisClient();
    if (!client) return false;
    try {
        const val = await client.get(`blacklist:${token}`);
        return val === '1';
    } catch (err) {
        console.error('[Redis] Token blacklist check error:', err.message);
        return false;
    }
};

/**
 * Graceful shutdown
 */
const closeRedis = async () => {
    if (redis) await redis.quit();
    if (subscriber) await subscriber.quit();
};

module.exports = {
    getRedisClient,
    getSubscriber,
    cacheGet,
    cacheSet,
    cacheDel,
    blacklistToken,
    isTokenBlacklisted,
    closeRedis,
    DISTRIBUTED_MODE,
};

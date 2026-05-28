import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class BlacklistService {
  private readonly redis: Redis | null;
  private readonly logger = new Logger(BlacklistService.name);

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true });
      this.redis.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    } else {
      this.redis = null;
    }
  }

  async isBlacklisted(userId: string): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const val = await this.redis.get(`blacklist:${userId}`);
      return val !== null;
    } catch {
      return false;
    }
  }

  async add(userId: string, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    await this.redis.set(`blacklist:${userId}`, '1', 'EX', ttlSeconds);
  }

  async trackActiveUser(userId: string): Promise<void> {
    if (!this.redis) return;
    try {
      const key = 'active_users';
      await this.redis.sadd(key, userId);
      // Refresh the set TTL on each request (5 min window)
      await this.redis.expire(key, 300);
      // Also track per-user heartbeat so we can prune stale members
      await this.redis.set(`active_hb:${userId}`, '1', 'EX', 300);
    } catch {
      // ignore Redis errors
    }
  }

  async getActiveUserCount(): Promise<number> {
    if (!this.redis) return 0;
    try {
      // Prune members whose heartbeat has expired
      const members = await this.redis.smembers('active_users');
      const pipeline = this.redis.pipeline();
      for (const m of members) {
        pipeline.exists(`active_hb:${m}`);
      }
      const results = await pipeline.exec();
      let count = 0;
      const toRemove: string[] = [];
      members.forEach((m, i) => {
        const exists = results?.[i]?.[1];
        if (exists) count++;
        else toRemove.push(m);
      });
      if (toRemove.length > 0) await this.redis.srem('active_users', ...toRemove);
      return count;
    } catch {
      return 0;
    }
  }
}

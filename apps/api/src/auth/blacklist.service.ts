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
}

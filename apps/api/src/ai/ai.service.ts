import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

const RATE_LIMIT_PER_HOUR = 20;
const RATE_WINDOW_SECONDS = 3600;
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;
  private readonly redis: Redis | null;

  constructor(private readonly supabase: SupabaseService) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');
    this.anthropic = new Anthropic({ apiKey });

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true });
      this.redis.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    } else {
      this.logger.warn('REDIS_URL not set — rate limiting disabled');
      this.redis = null;
    }
  }

  async generateCompletion(opts: {
    userId: string;
    tenantId: string;
    feature: string;
    systemPrompt: string;
    userMessage: string;
  }): Promise<string> {
    await this.checkRateLimit(opts.userId);

    const promptHash = crypto
      .createHash('sha256')
      .update(opts.systemPrompt + opts.userMessage)
      .digest('hex');

    const startMs = Date.now();
    let response = '';
    let tokensUsed = 0;

    try {
      const msg = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: opts.systemPrompt,
        messages: [{ role: 'user', content: opts.userMessage }],
      });

      response = msg.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');

      tokensUsed = msg.usage.input_tokens + msg.usage.output_tokens;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Anthropic API error: ${message}`);
      throw new HttpException('Serviço de IA indisponível', HttpStatus.SERVICE_UNAVAILABLE);
    } finally {
      await this.logSuggestion({
        userId: opts.userId,
        tenantId: opts.tenantId,
        feature: opts.feature,
        promptHash,
        response,
        tokensUsed,
        latencyMs: Date.now() - startMs,
      });
    }

    return response;
  }

  private async checkRateLimit(userId: string) {
    if (!this.redis) return;

    const key = `ai_rate:${userId}`;
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, RATE_WINDOW_SECONDS);
      }
      if (count > RATE_LIMIT_PER_HOUR) {
        const ttl = await this.redis.ttl(key);
        throw new HttpException(
          { message: 'Limite de 20 chamadas/hora atingido', retryAfter: ttl },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Redis failure — allow the call through (fail-open)
      this.logger.warn(`Rate limit check failed: ${(err as Error).message}`);
    }
  }

  private async logSuggestion(opts: {
    userId: string;
    tenantId: string;
    feature: string;
    promptHash: string;
    response: string;
    tokensUsed: number;
    latencyMs: number;
  }) {
    const { error } = await this.supabase.admin.from('ai_suggestions').insert({
      user_id: opts.userId,
      tenant_id: opts.tenantId,
      feature: opts.feature,
      prompt_hash: opts.promptHash,
      response: opts.response,
      tokens_used: opts.tokensUsed,
      model: DEFAULT_MODEL,
      latency_ms: opts.latencyMs,
    });
    if (error) this.logger.error(`Failed to log AI suggestion: ${error.message}`);
  }
}

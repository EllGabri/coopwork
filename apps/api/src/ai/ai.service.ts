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

  async suggestNextTasks(
    boardId: string,
    userId: string,
    tenantId: string,
  ): Promise<Array<{ title: string; description: string; priority: string }>> {
    // Build board context
    const { data: board } = await this.supabase.admin
      .from('boards')
      .select('name, board_columns(name, cards(title, priority, due_date))')
      .eq('id', boardId)
      .single();

    const boardContext = JSON.stringify(board ?? { name: 'Board' }, null, 2);
    const systemPrompt =
      'Você é um assistente de gestão de projetos para uma cooperativa de crédito brasileira. ' +
      'Dado o estado atual do board, sugira exatamente 3 novas tarefas relevantes. ' +
      'Responda APENAS com JSON válido no formato: ' +
      '[{"title":"...","description":"...","priority":"low|medium|high|urgent"}]';

    const raw = await this.generateCompletion({
      userId,
      tenantId,
      feature: 'suggest_tasks',
      systemPrompt,
      userMessage: `Estado atual do board:\n${boardContext}\n\nSugira 3 próximas tarefas.`,
    });

    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');
      const suggestions = JSON.parse(jsonMatch[0]) as Array<{
        title: string;
        description: string;
        priority: string;
      }>;
      return suggestions.slice(0, 3);
    } catch {
      this.logger.error('Failed to parse AI suggestions');
      return [];
    }
  }

  async summarizeMeeting(
    ataText: string,
    userId: string,
    tenantId: string,
  ): Promise<Array<{ deliberation: string; responsible?: string }>> {
    const systemPrompt =
      'Você é um secretário executivo de uma cooperativa de crédito brasileira. ' +
      'Leia a ata de reunião e extraia até 10 deliberações concretas com responsável se identificado. ' +
      'Responda APENAS com JSON no formato: ' +
      '[{"deliberation":"...","responsible":"nome ou null"}]';

    const raw = await this.generateCompletion({
      userId,
      tenantId,
      feature: 'meeting_summary',
      systemPrompt,
      userMessage: `Ata da reunião:\n\n${ataText.slice(0, 4000)}\n\nExtraia as deliberações.`,
    });

    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array');
      const items = JSON.parse(jsonMatch[0]) as Array<{
        deliberation: string;
        responsible?: string;
      }>;
      return items.slice(0, 10);
    } catch {
      return [];
    }
  }

  async suggestGedImprovements(
    tenantId: string,
    userId: string,
  ): Promise<Array<{ title: string; description: string; category: string }>> {
    const { data: docs } = await this.supabase.admin
      .from('documents')
      .select(
        'title, mime_type, review_date, expiration_date, current_version, created_at, updated_at',
      )
      .eq('tenant_id', tenantId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(20);

    const systemPrompt =
      'Você é um consultor de gestão documental para cooperativas de crédito brasileiras. ' +
      'Analise os documentos recentes e sugira 3 a 5 melhorias ou automações de processos. ' +
      'Responda APENAS com JSON no formato: ' +
      '[{"title":"...","description":"...","category":"automação|processo|conformidade|organização"}]';

    const raw = await this.generateCompletion({
      userId,
      tenantId,
      feature: 'ged_improvements',
      systemPrompt,
      userMessage: `Documentos recentes do GED:\n${JSON.stringify(docs ?? [], null, 2)}\n\nSugira melhorias.`,
    });

    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array');
      return JSON.parse(jsonMatch[0]) as Array<{
        title: string;
        description: string;
        category: string;
      }>;
    } catch {
      return [];
    }
  }

  async analyzeRisks(
    boardId: string,
    userId: string,
    tenantId: string,
  ): Promise<Array<{ risk: string; severity: string; mitigation: string }>> {
    const { data: board } = await this.supabase.admin
      .from('boards')
      .select('name, board_columns(name, cards(title, priority, due_date, assignee_ids))')
      .eq('id', boardId)
      .single();

    const boardContext = JSON.stringify(board ?? { name: 'Board' }, null, 2);
    const systemPrompt =
      'Você é um analista de riscos de projetos para uma cooperativa de crédito brasileira. ' +
      'Analise o board e identifique 3 a 5 riscos principais (cards atrasados, sobrecargas, dependências). ' +
      'Responda APENAS com JSON válido no formato: ' +
      '[{"risk":"...","severity":"baixo|médio|alto","mitigation":"..."}]';

    const raw = await this.generateCompletion({
      userId,
      tenantId,
      feature: 'risk_analysis',
      systemPrompt,
      userMessage: `Estado atual do board:\n${boardContext}\n\nIdentifique os riscos.`,
    });

    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');
      return JSON.parse(jsonMatch[0]) as Array<{
        risk: string;
        severity: string;
        mitigation: string;
      }>;
    } catch {
      return [];
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

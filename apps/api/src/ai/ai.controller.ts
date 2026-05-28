import { Controller, Post, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AiService } from './ai.service';

type AuthUser = JwtPayload & { userId: string };

@Controller('ai')
@UseGuards(JwtAuthGuard)
@SkipThrottle() // AI routes use their own per-user rate limit via AiService
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('complete')
  generate(
    @Body() body: { feature: string; systemPrompt: string; userMessage: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiService.generateCompletion({
      userId: user.userId,
      tenantId: user.tenantId,
      feature: body.feature,
      systemPrompt: body.systemPrompt,
      userMessage: body.userMessage,
    });
  }

  @Post('boards/:boardId/suggest-tasks')
  suggestTasks(@Param('boardId', ParseUUIDPipe) boardId: string, @CurrentUser() user: AuthUser) {
    return this.aiService.suggestNextTasks(boardId, user.userId, user.tenantId);
  }

  @Post('boards/:boardId/analyze-risks')
  analyzeRisks(@Param('boardId', ParseUUIDPipe) boardId: string, @CurrentUser() user: AuthUser) {
    return this.aiService.analyzeRisks(boardId, user.userId, user.tenantId);
  }

  @Post('ged/suggest-improvements')
  suggestGedImprovements(@CurrentUser() user: AuthUser) {
    return this.aiService.suggestGedImprovements(user.tenantId, user.userId);
  }

  @Post('ged/summarize-meeting')
  summarizeMeeting(@Body('text') text: string, @CurrentUser() user: AuthUser) {
    return this.aiService.summarizeMeeting(text ?? '', user.userId, user.tenantId);
  }

  @Post('reports/generate-narrative')
  generateReportNarrative(
    @Body('data') data: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiService.generateReportNarrative(data ?? {}, user.userId, user.tenantId);
  }
}

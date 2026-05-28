import { Controller, Post, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AiService } from './ai.service';

type AuthUser = JwtPayload & { userId: string };

@Controller('ai')
@UseGuards(JwtAuthGuard)
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
}

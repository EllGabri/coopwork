import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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
}

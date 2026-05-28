import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CardsService } from './cards.service';
import { CreateCardDto } from './cards.dto';

// Nested: POST /columns/:columnId/cards
@Controller('columns/:columnId/cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardsNestedController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  findAll(@Param('columnId') columnId: string) {
    return this.cardsService.findByColumn(columnId);
  }

  @Post()
  create(
    @Param('columnId') columnId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: { tenantId: string; userId: string; boardId?: string },
    @Body('boardId') boardId: string,
  ) {
    return this.cardsService.create(columnId, boardId, user.tenantId, user.userId, dto);
  }
}

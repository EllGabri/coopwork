import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CardsService } from './cards.service';
import { UpdateCardDto, MoveCardDto } from './cards.dto';

// Direct: GET/PATCH/DELETE /cards/:id
@Controller('cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCardDto) {
    return this.cardsService.update(id, dto);
  }

  @Patch(':id/position')
  move(@Param('id') id: string, @Body() dto: MoveCardDto) {
    return this.cardsService.move(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardsService.remove(id);
  }
}

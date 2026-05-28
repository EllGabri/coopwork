import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ColumnsService } from './columns.service';
import { CreateColumnDto, UpdateColumnDto, ReorderColumnsDto } from './columns.dto';

@Controller('boards/:boardId/columns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Get()
  findAll(@Param('boardId') boardId: string) {
    return this.columnsService.findByBoard(boardId);
  }

  @Post()
  @Roles('manager')
  create(@Param('boardId') boardId: string, @Body() dto: CreateColumnDto) {
    return this.columnsService.create(boardId, dto);
  }

  @Patch('reorder')
  @Roles('manager')
  reorder(@Param('boardId') boardId: string, @Body() dto: ReorderColumnsDto) {
    return this.columnsService.reorder(boardId, dto.order);
  }

  @Patch(':id')
  @Roles('manager')
  update(@Param('id') id: string, @Body() dto: UpdateColumnDto) {
    return this.columnsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('manager')
  remove(@Param('id') id: string) {
    return this.columnsService.remove(id);
  }
}

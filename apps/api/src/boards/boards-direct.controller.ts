import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BoardsService } from './boards.service';
import { UpdateBoardDto } from './boards.dto';

@Controller('boards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BoardsDirectController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { tenantId: string }) {
    return this.boardsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles('manager')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() user: { tenantId: string },
  ) {
    return this.boardsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Roles('director')
  remove(@Param('id') id: string, @CurrentUser() user: { tenantId: string }) {
    return this.boardsService.remove(id, user.tenantId);
  }
}

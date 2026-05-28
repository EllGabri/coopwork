import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './boards.dto';

@Controller('workspaces/:workspaceId/boards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  findAll(@Param('workspaceId') workspaceId: string, @CurrentUser() user: { tenantId: string }) {
    return this.boardsService.findByWorkspace(workspaceId, user.tenantId);
  }

  @Post()
  @Roles('manager')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateBoardDto,
    @CurrentUser() user: { tenantId: string; userId: string },
  ) {
    return this.boardsService.create(workspaceId, dto, user.tenantId, user.userId);
  }
}

import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { BoardsDirectController } from './boards-direct.controller';
import { BoardsService } from './boards.service';

@Module({
  controllers: [BoardsController, BoardsDirectController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}

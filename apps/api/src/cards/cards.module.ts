import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsNestedController } from './cards-nested.controller';
import { CardsService } from './cards.service';

@Module({
  controllers: [CardsController, CardsNestedController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}

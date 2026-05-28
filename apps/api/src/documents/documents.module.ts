import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentLifecycleService } from './document-lifecycle.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentLifecycleService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

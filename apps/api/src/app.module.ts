import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BoardsModule } from './boards/boards.module';
import { ColumnsModule } from './columns/columns.module';
import { CardsModule } from './cards/cards.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { SystemParamsService } from './admin/system-params.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env.local', '../../.env'] }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    BoardsModule,
    ColumnsModule,
    CardsModule,
    CommentsModule,
    NotificationsModule,
    DocumentsModule,
    AiModule,
    AdminModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SystemParamsService],
  exports: [SystemParamsService],
})
export class AppModule {}

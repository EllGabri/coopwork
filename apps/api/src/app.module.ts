import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
    ThrottlerModule.forRoot([
      {
        name: 'public',
        ttl: 60_000, // 1 minute window
        limit: 100, // 100 req/min per IP for public routes
      },
      {
        name: 'authenticated',
        ttl: 60_000,
        limit: 300, // 300 req/min per authenticated user
      },
    ]),
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
  providers: [AppService, SystemParamsService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
  exports: [SystemParamsService],
})
export class AppModule {}

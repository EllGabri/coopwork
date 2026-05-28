import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BoardsModule } from './boards/boards.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env.local', '../../.env'] }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    BoardsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

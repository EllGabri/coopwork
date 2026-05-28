import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { BlacklistService } from '../auth/blacklist.service';
import { PermissionsService } from '../auth/permissions.service';
import { SystemParamsService } from './system-params.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is required');
        return { secret, signOptions: { expiresIn: '8h' } };
      },
    }),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminAuthGuard,
    BlacklistService,
    PermissionsService,
    SystemParamsService,
  ],
  exports: [AdminService, AdminAuthGuard, SystemParamsService],
})
export class AdminModule {}

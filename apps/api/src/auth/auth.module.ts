import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionsService } from './permissions.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET env var is required');
        return {
          secret,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PermissionsService, GoogleStrategy, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtModule, PermissionsService, RolesGuard],
})
export class AuthModule {}

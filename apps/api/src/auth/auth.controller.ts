import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthService, AuthUser } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Passport redireciona para Google — handler nunca executa
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request & { user: AuthUser }, @Res() res: Response) {
    const token = this.authService.signJwt(req.user);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    res.redirect(process.env.WEB_URL ?? 'http://localhost:5173');
  }

  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token', { httpOnly: true });
    res.json({ message: 'Logout realizado com sucesso' });
  }
}

import 'reflect-metadata';
import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// Initialize Sentry before anything else
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // CORS — restrict to configured web origin in production
  const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
  const allowedOrigins = [webUrl];
  if (process.env.VERCEL_URL) allowedOrigins.push(`https://${process.env.VERCEL_URL}`);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Redirect HTTP → HTTPS in production (trust Railway/Vercel reverse proxy)
  if (process.env.NODE_ENV === 'production') {
    app.use(
      (
        req: import('express').Request,
        res: import('express').Response,
        next: import('express').NextFunction,
      ) => {
        const forwardedProto = req.headers['x-forwarded-proto'] as string | undefined;
        if (forwardedProto && forwardedProto !== 'https') {
          return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        return next();
      },
    );
  }

  // Helmet — security headers
  app.use(
    helmet({
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", webUrl],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      xContentTypeOptions: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Remove X-Powered-By
      hidePoweredBy: true,
    }),
  );

  // Global Sentry exception filter — captures 5xx + auth errors
  const { SentryExceptionFilter } = await import('./common/sentry-exception.filter');
  app.useGlobalFilters(new SentryExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // enables class-transformer (required for @SanitizeText decorators)
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

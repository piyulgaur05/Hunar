import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { db } from '@mitti/database';
import { Redis } from '@mitti/integrations';
import { AppModule } from './app.module';
import { ApiExceptionFilter, PermissionGuard, RequestContext, logger } from './common/http';
import { AuthService } from './modules/auth/auth.service';
import type { Response, NextFunction } from 'express';
async function main() {
  if (process.env.NODE_ENV === 'production') {
    for (const key of [
      'DATABASE_URL',
      'REDIS_URL',
      'ALLOWED_ORIGINS',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
      'S3_BUCKET',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
      'SMTP_HOST',
      'SMTP_FROM',
    ])
      if (!process.env[key]) throw new Error(`${key} is required in production`);
    if (process.env.PAYMENT_PROVIDER !== 'razorpay') throw new Error('Configure a live payment provider');
  }
  const app = await NestFactory.create(AppModule, { rawBody: true, logger: ['error', 'warn', 'log'] });
  app.use(helmet());
  app.use(cookieParser());
  const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',');
  app.enableCors({ origin: allowed, credentials: true });
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6386', { maxRetriesPerRequest: 1 });
  const auth = app.get(AuthService);
  app.use(async (req: RequestContext, res: Response, next: NextFunction) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    const start = Date.now();
    res.on('finish', () =>
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
        },
        'request',
      ),
    );
    try {
      if (
        !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
        req.path !== '/payments/webhook' &&
        (!req.headers.origin || !allowed.includes(req.headers.origin))
      )
        return res
          .status(403)
          .json({ data: null, error: { code: 'CSRF_REJECTED', message: 'Request origin is not allowed' } });
      const sensitive = req.path.startsWith('/auth/') && req.method === 'POST';
      const key = `rate:${req.ip}:${sensitive ? 'auth' : 'api'}:${Math.floor(Date.now() / 60000)}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 65);
      if (count > (sensitive ? 20 : 600)) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({
          data: null,
          error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a minute.' },
        });
      }
      req.user = await auth.identity(req.cookies.mitti_session);
      next();
    } catch (error) {
      next(error);
    }
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalGuards(new PermissionGuard());
  const express = app.getHttpAdapter().getInstance();
  express.get('/health', async (_req: RequestContext, res: Response) => {
    try {
      await db.$queryRaw`SELECT 1`;
      await redis.ping();
      res.json({ status: 'ok', database: 'connected', redis: 'connected' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  const config = new DocumentBuilder()
    .setTitle('Hunaré Commerce API')
    .setDescription(
      'Cookie-authenticated REST API. Browser mutations require an allowlisted Origin. Monetary values use integer paise.',
    )
    .setVersion('1.0')
    .addCookieAuth('mitti_session')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT || 4000), '0.0.0.0');
  logger.info('Commerce API ready');
}
main().catch((error) => {
  logger.fatal({ err: error }, 'Startup failed');
  process.exit(1);
});

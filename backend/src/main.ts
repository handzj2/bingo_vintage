import { NestFactory }          from '@nestjs/core';
import { AllExceptionFilter }    from './common/filters/all-exception.filter';
import { ValidationPipe }       from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule }            from './app.module';
import compression              from 'compression';   // ✅ default import (works with esModuleInterop: true)
import helmet                   from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // In production, Railway captures stdout — NestJS structured logs
    // are readable in Railway's log stream and any forwarded sink.
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']          // structured, no verbose/debug noise
      : ['error', 'warn', 'log', 'debug'],
  });

  app.enableShutdownHooks();
  app.use(helmet());
  app.use(compression());

  // Stripe pattern: every error normalised into a consistent JSON envelope
  // with X-Request-Id attached and no internal stack traces in production.
  app.useGlobalFilters(new AllExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  app.setGlobalPrefix('api');

  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000'
  ).split(',').map(o => o.trim());

  app.enableCors({
    origin:      allowedOrigins,
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Bingo Vintage API')
      .setDescription('HZ Finance — Motorcycle Lending Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.info(JSON.stringify({ level: 'info', message: `API started`, port, env: process.env.NODE_ENV, ts: new Date().toISOString() }));
}

bootstrap();
// Deploy trigger  mnnnmn2026-06-14
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import compression from 'compression';
import helmet from 'helmet';

const MAIN_PORT = Number(process.env.PORT ?? 3000);
const NEST_PORT = 3001; // internal only

async function start() {
  // ------------------- Express health wrapper -------------------
  const app = express();

  // Permanent health endpoint – always available
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Proxy everything else to NestJS
  const proxy = createProxyMiddleware({
    target: `http://127.0.0.1:${NEST_PORT}`,
    changeOrigin: true,
    on: {
      error: (_err: any, _req: any, res: any) => {
        // res could be a Socket or an Express Response
        if (res && typeof res.status === 'function') {
          res.status(502).json({ error: 'Backend not ready' });
        } else if (res && res.destroy) {
          res.destroy();
        }
      },
    },
  });
  app.use('/', proxy);

  // Start Express on the main port – always listening
  app.listen(MAIN_PORT, '0.0.0.0', () => {
    console.log(`Express health wrapper on port ${MAIN_PORT}`);
  });

  // ------------------- Start NestJS on internal port -------------------
  const nestApp = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug'],
  });

  nestApp.enableShutdownHooks();
  nestApp.use(helmet());
  nestApp.use(compression());
  nestApp.useGlobalFilters(new AllExceptionFilter());
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  nestApp.setGlobalPrefix('api');

  // CORS – allow your Vercel frontend
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());
  nestApp.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Swagger (non‑production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Bingo Vintage API')
      .setDescription('HZ Finance — Motorcycle Lending Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', nestApp, SwaggerModule.createDocument(nestApp, config));
  }

  await nestApp.listen(NEST_PORT, '127.0.0.1');
  console.log(`NestJS running internally on port ${NEST_PORT}`);
}

start().catch(err => {
  console.error('Start failed:', err);
  process.exit(1);
});
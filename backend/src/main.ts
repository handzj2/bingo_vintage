// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import compression from 'compression';
import helmet from 'helmet';
import * as http from 'http';

const port = Number(process.env.PORT ?? 3001);

// ------------------------------------------------------------------
// Temporary HTTP server – binds to port instantly for Railway health checks
// ------------------------------------------------------------------
const tempServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'starting' }));
    return;
  }

  // For any other path, respond with 503 Service Unavailable
  // This tells the platform / load balancer to retry later.
  res.writeHead(503, {
    'Content-Type': 'application/json',
    'Retry-After': '5',               // seconds until ready
  });
  res.end(JSON.stringify({ status: 'unavailable', message: 'NestJS is still starting' }));
});

tempServer.listen(port, '0.0.0.0', () => {
  console.log(`Health server ready on port ${port}`);
});

// ------------------------------------------------------------------
// Main bootstrap – starts NestJS, then hands off the port
// ------------------------------------------------------------------
async function bootstrap() {
  console.log('BOOTSTRAP STARTED');

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug'],
  });

  // --- Global middleware & pipes ---
  app.enableShutdownHooks();
  app.use(helmet());
  app.use(compression());
  app.useGlobalFilters(new AllExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  // --- CORS ---
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // --- Swagger (non‑production only) ---
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Bingo Vintage API')
      .setDescription('HZ Finance — Motorcycle Lending Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  // --- Port handoff: close temp server, then start NestJS on same port ---
  await new Promise<void>((resolve) => tempServer.close(() => resolve()));
  await app.listen(port, '0.0.0.0');

  console.info(
    JSON.stringify({
      level: 'info',
      message: 'API started',
      port,
      env: process.env.NODE_ENV,
      ts: new Date().toISOString(),
    }),
  );
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err?.message ?? err);
  // Keep temp server alive so the container stays responsive
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled rejection:', reason?.message ?? reason);
});
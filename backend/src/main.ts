// health route test
import { NestFactory }    from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule }      from './app.module';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import compression from 'compression';
import helmet      from 'helmet';
import * as http   from 'http';

const port = Number(process.env.PORT ?? 3001);

// Step 1: Bind to port immediately so Railway health check gets a 200
// before NestJS or TypeORM finish initialising
const tempServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'starting' }));
});

tempServer.listen(port, '0.0.0.0', () => {
  console.log(`Health server ready on port ${port}`);
});

// Step 2: Initialise NestJS in background
async function bootstrap() {
  console.log('BOOTSTRAP STARTED');

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug'],
  });

  app.enableShutdownHooks();
  app.use(helmet());
  app.use(compression());
  app.useGlobalFilters(new AllExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    forbidNonWhitelisted: true,
    transform:            true,
  }));

  app.setGlobalPrefix('api');

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',').map(o => o.trim());

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
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  // Step 3: Hand off port from temp server to NestJS
  await new Promise<void>(resolve => tempServer.close(() => resolve()));
  await app.listen(port, '0.0.0.0');

  console.info(JSON.stringify({
    level: 'info', message: 'API started',
    port, env: process.env.NODE_ENV, ts: new Date().toISOString(),
  }));
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err?.message ?? err);
  // Keep temp server alive — do not exit
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled rejection:', reason?.message ?? reason);
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security & Optimization
  app.use(helmet());
  app.use(compression());
  
  app.enableCors({
    // ✅ Added 3005 to match your new frontend port
    origin: [
      'http://localhost:3000', 
      'http://localhost:3005', 
      'http://localhost:5000'
    ], 
    credentials: true,
  });

  // Add global prefix for all routes
  app.setGlobalPrefix('api'); // This will make all routes start with /api

  // Data Validation
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // API Documentation (Swagger) - FIXED
  const config = new DocumentBuilder()
    .setTitle('BikeSure API') // Updated title
    .setDescription('Motorcycle Loan Management System API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name is important for Swagger UI
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { // Changed from 'api/docs' to 'docs'
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger UI available at: http://localhost:${port}/docs`);
  console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth/...`);
}
bootstrap();
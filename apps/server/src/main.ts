import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // CORS — tighten origin list in production via ALLOWED_ORIGINS env
  // NOTE: credentials:true is incompatible with origin:'*'; use an explicit
  // list or `true` (reflects request origin) so preflight passes.
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe — strips unknown fields, auto-transforms primitives
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;

  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${config.get<string>('nodeEnv', 'development')}`);
}

bootstrap();

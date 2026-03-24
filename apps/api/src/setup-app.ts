import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

export function setupApp(app: INestApplication) {
  const expressApp = app as NestExpressApplication;

  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  expressApp.enableCors({
    origin: allowedOrigins ? allowedOrigins.split(',') : true,
    credentials: true,
  });

  // Static uploads
  // Note: we use process.cwd() to find 'uploads' folder. 
  // Ensure it exists where the process starts (usually app root or monorepo root)
  expressApp.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  expressApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}

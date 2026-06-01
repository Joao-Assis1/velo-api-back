import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import express, { raw } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import type { Request, Response } from 'express';

const server = express();
let isInitialized = false;

async function createApp(): Promise<void> {
  if (isInitialized) return;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.use(
    '/api/v1/webhooks/stripe',
    raw({ type: 'application/json' }),
    (req: any, _res: any, next: any) => {
      req.rawBody = req.body;
      next();
    },
  );

  app.use(compression());
  app.use(helmet());

  const corsOriginRaw = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const corsOrigins = corsOriginRaw.split(',').map((o) => {
    const t = o.trim();
    const m = t.match(/^\/(.+)\/([gimsuy]*)$/);
    return m ? new RegExp(m[1], m[2]) : t;
  });
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-admin-key',
      'x-test-mode',
    ],
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Velo API')
    .setDescription('The Velo API for Driving School Management')
    .setVersion('1.0')
    .addTag('users')
    .addTag('vehicles')
    .addTag('availability')
    .addTag('lessons')
    .addTag('payments')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
    ],
  });

  await app.init();
  isInitialized = true;
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  await createApp();
  server(req, res);
}

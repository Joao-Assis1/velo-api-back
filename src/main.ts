import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { raw } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Stripe webhook needs raw body for HMAC signature verification
  app.use(
    '/api/v1/webhooks/stripe',
    raw({ type: 'application/json' }),
    (req: any, _res: any, next: any) => {
      req.rawBody = req.body;
      next();
    },
  );

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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-test-mode'],
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

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);
  Logger.log(
    `🚀 VELO-api rodando em: http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
  Logger.log(
    `📚 Swagger Documentation rodando em: http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}
void bootstrap();

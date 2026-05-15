import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { raw } from 'express';
import { AppModule } from '../src/app.module';
import { STRIPE_CLIENT } from '../src/modules/payments-stripe/stripe.client';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('StripeWebhooks (e2e)', () => {
  let app: INestApplication;
  const constructEvent = jest.fn();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue({
        webhooks: { constructEvent },
        customers: { create: jest.fn() },
        setupIntents: { create: jest.fn() },
        paymentMethods: { attach: jest.fn(), retrieve: jest.fn(), detach: jest.fn() },
        paymentIntents: { create: jest.fn() },
        transfers: { create: jest.fn() },
        refunds: { create: jest.fn() },
        accounts: { create: jest.fn(), retrieve: jest.fn() },
        accountLinks: { create: jest.fn() },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Middleware raw body — necessário para verificação HMAC do Stripe
    app.use(
      '/api/v1/webhooks/stripe',
      raw({ type: 'application/json' }),
      (req: any, _res: any, next: any) => {
        req.rawBody = req.body;
        next();
      },
    );

    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    constructEvent.mockReset();
  });

  it('rejeita 400 quando header stripe-signature está ausente', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(400);
  });

  it('retorna 200 { received: true } para evento payment_intent.succeeded válido', async () => {
    constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_e2e_1' } },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Stripe-Signature', 't=1,v1=anything')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(200);

    expect(res.body.data?.received ?? res.body.received).toBe(true);
  });

  it('rejeita 400 quando constructEvent lança erro de assinatura inválida', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('invalid sig');
    });

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Stripe-Signature', 't=1,v1=bad')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(400);
  });

  it('retorna 200 para evento desconhecido (ignora sem erro)', async () => {
    constructEvent.mockReturnValue({
      type: 'unhandled.foo',
      data: { object: {} },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Stripe-Signature', 't=1,v1=anything')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(200);

    expect(res.body.data?.received ?? res.body.received).toBe(true);
  });
});

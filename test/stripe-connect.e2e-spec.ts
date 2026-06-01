import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { STRIPE_CLIENT } from '../src/modules/payments-stripe/stripe.client';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const loginInstructor = async (
  app: INestApplication,
  email: string,
): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login/instructor')
    .send({ email, password: '123456' });
  if (res.status !== 201) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data?.access_token ?? res.body.access_token;
};

describe('StripeConnect (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const stripeMock = {
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_e2e_connect' }),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({
        url: 'https://connect.stripe.com/setup/e2e',
        expires_at: 1700000000,
      }),
    },
    customers: { create: jest.fn() },
    setupIntents: { create: jest.fn() },
    paymentMethods: {
      attach: jest.fn(),
      retrieve: jest.fn(),
      detach: jest.fn(),
    },
    paymentIntents: { create: jest.fn() },
    transfers: { create: jest.fn() },
    refunds: { create: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue(stripeMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Resetar stripeAccountId para evitar interferência entre test runs
    await prisma.instructor.updateMany({
      where: { stripeAccountId: 'acct_e2e_connect' },
      data: { stripeAccountId: null, stripeAccountStatus: 'PENDING' },
    });
    await app.close();
  });

  it('POST /payments-stripe/connect/onboard retorna Account Link URL do Stripe', async () => {
    const token = await loginInstructor(app, 'roberto@email.com');
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments-stripe/connect/onboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(res.body.data.url).toMatch(/connect\.stripe\.com/);
    expect(res.body.data.expiresAt).toBe(1700000000);
    expect(stripeMock.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'express', country: 'BR' }),
      expect.any(Object),
    );
  });

  it('GET /payments-stripe/connect/status retorna status do instrutor', async () => {
    const token = await loginInstructor(app, 'roberto@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/payments-stripe/connect/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.stripeAccountStatus).toBeTruthy();
  });
});

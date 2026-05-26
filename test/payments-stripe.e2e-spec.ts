import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { STRIPE_CLIENT } from '../src/modules/payments-stripe/stripe.client';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const loginStudent = async (
  app: INestApplication,
  email: string,
): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login/student')
    .send({ email, password: '123456' });
  if (res.status !== 201) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data?.access_token ?? res.body.access_token;
};

describe('PaymentsStripe (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const stripeMock = {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test_e2e' }),
      retrieve: jest.fn(),
    },
    setupIntents: {
      create: jest.fn().mockResolvedValue({ client_secret: 'seti_secret_e2e' }),
    },
    paymentMethods: {
      attach: jest.fn().mockResolvedValue({}),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pm_test_e2e',
        card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
        billing_details: { name: 'Aluno E2E' },
      }),
      detach: jest.fn().mockResolvedValue({}),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test_e2e', status: 'requires_capture' }),
    },
    transfers: { create: jest.fn() },
    refunds: { create: jest.fn() },
    accounts: { create: jest.fn(), retrieve: jest.fn() },
    accountLinks: { create: jest.fn() },
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
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    // Garantir estado limpo para os testes
    await prisma.paymentMethod.deleteMany({ where: { stripePaymentMethodId: 'pm_test_e2e' } });
    await prisma.student.updateMany({
      where: { email: 'student-ladv@email.com' },
      data: { stripeCustomerId: null },
    });
  });

  afterAll(async () => {
    await prisma.paymentMethod.deleteMany({ where: { stripePaymentMethodId: 'pm_test_e2e' } });
    await app.close();
  });

  it('POST /payments-stripe/setup-intent cria customer e retorna clientSecret', async () => {
    const token = await loginStudent(app, 'student-ladv@email.com');
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments-stripe/setup-intent')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(res.body.data.clientSecret).toBeTruthy();
    expect(res.body.data.customerId).toBe('cus_test_e2e');
    expect(stripeMock.customers.create).toHaveBeenCalled();
  });

  it('POST /payments-stripe/payment-methods salva cartão com metadata do Stripe', async () => {
    const token = await loginStudent(app, 'student-ladv@email.com');
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments-stripe/payment-methods')
      .set('Authorization', `Bearer ${token}`)
      .send({ stripePaymentMethodId: 'pm_test_e2e' })
      .expect(201);

    expect(res.body.data.brand).toBe('visa');
    expect(res.body.data.last4).toBe('4242');
    expect(res.body.data.isDefault).toBe(true);
    expect(stripeMock.paymentMethods.attach).toHaveBeenCalledWith(
      'pm_test_e2e',
      expect.objectContaining({ customer: 'cus_test_e2e' }),
      expect.any(Object),
    );
  });

  it('GET /payments-stripe/me lista pagamentos do aluno', async () => {
    const token = await loginStudent(app, 'student-ladv@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/payments-stripe/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

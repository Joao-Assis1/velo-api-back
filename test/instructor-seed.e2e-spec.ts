import * as path from 'path';
import * as dotenv from 'dotenv';
// Carregar .env do projeto principal (worktree não tem .env próprio)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { STRIPE_CLIENT } from '../src/modules/payments-stripe/stripe.client';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const loginInstructor = async (app: INestApplication, email: string): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login/instructor')
    .send({ email, password: '123456' })
    .expect(201);
  return res.body.data.access_token;
};

const stripeMock = {
  accounts: {
    create: jest.fn().mockResolvedValue({ id: 'acct_mock_new' }),
  },
};

describe('InstructorSeed (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ENABLE_TEST_MODE = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue(stripeMock)
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    delete process.env.ENABLE_TEST_MODE;
    await app.close();
  });

  it('POST /instructors/me/seed-test → 403 sem header X-Test-Mode', async () => {
    const token = await loginInstructor(app, 'roberto@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/instructors/me/seed-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('POST /instructors/me/seed-test → 200 com X-Test-Mode: true', async () => {
    const token = await loginInstructor(app, 'roberto@email.com');
    const res = await request(app.getHttpServer())
      .post('/api/v1/instructors/me/seed-test')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Test-Mode', 'true')
      .expect(200);

    expect(res.body.data.stripeAccountId).toBeTruthy();
    expect(res.body.data.stripeAccountStatus).toBe('ACTIVE');
    expect(res.body.data.stripePayoutsEnabled).toBe(true);
  });

  it('POST /instructors/me/seed-test → idempotente (segunda chamada reutiliza account)', async () => {
    const token = await loginInstructor(app, 'roberto@email.com');

    const res1 = await request(app.getHttpServer())
      .post('/api/v1/instructors/me/seed-test')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Test-Mode', 'true')
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .post('/api/v1/instructors/me/seed-test')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Test-Mode', 'true')
      .expect(200);

    expect(res1.body.data.stripeAccountId).toBe(res2.body.data.stripeAccountId);
  });

  it('POST /instructors/me/seed-test → 401 sem token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/instructors/me/seed-test')
      .set('X-Test-Mode', 'true')
      .expect(401);
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

interface AuthResponse {
  access_token: string;
  user: { id: string };
}

jest.setTimeout(60000);

const login = async (app: INestApplication, email: string): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login/student')
    .send({ email, password: '123456' })
    .expect(201);
  return (res.body as { data: AuthResponse }).data.access_token;
};

describe('Journey (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const cases: Array<{ email: string; expectedStage: string }> = [
    { email: 'student-registered@email.com', expectedStage: 'REGISTERED' },
    { email: 'student-renach@email.com', expectedStage: 'RENACH_PENDING' },
    { email: 'student-medical@email.com', expectedStage: 'MEDICAL_PENDING' },
    { email: 'student-ladv@email.com', expectedStage: 'LADV_UPLOADED_VALID' },
    { email: 'student-ready@email.com', expectedStage: 'READY_FOR_PRACTICAL_EXAM' },
  ];

  it.each(cases)(
    'GET /journey/me retorna stage $expectedStage para $email',
    async ({ email, expectedStage }) => {
      const token = await login(app, email);
      const res = await request(app.getHttpServer())
        .get('/api/v1/journey/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect((res.body as { data: { stage: string } }).data.stage).toBe(
        expectedStage,
      );
    },
  );

  it('GET /journey/me/timeline retorna 10 itens com statuses corretos para aluno LADV_UPLOADED_VALID', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/journey/me/timeline')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const timeline = (res.body as { data: Array<{ key: string; status: string }> }).data;
    expect(timeline).toHaveLength(10);

    const ladvStep = timeline.find((s) => s.key === 'LADV_UPLOADED_VALID');
    expect(ladvStep?.status).toBe('in_progress');

    const registeredStep = timeline.find((s) => s.key === 'REGISTERED');
    expect(registeredStep?.status).toBe('completed');
  });

  it('POST /journey/me/declare-ready-for-exam retorna 400 quando mínimo legal não atingido', async () => {
    const token = await login(app, 'student-ladv@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/journey/me/declare-ready-for-exam')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});

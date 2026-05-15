import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const login = async (
  app: INestApplication,
  email: string,
): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login/student')
    .send({ email, password: '123456' })
    .expect(201);
  return res.body.data.access_token;
};

describe('RenachProcess (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /renach/guide?uf=MS returns DETRAN-MS steps', async () => {
    const token = await login(app, 'student-renach@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/renach/guide?uf=MS')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.uf).toBe('MS');
    expect(
      res.body.data.steps.some((s: string) => /detran.*ms\.gov\.br/i.test(s)),
    ).toBe(true);
  });

  it('GET /renach/guide?uf=SP returns the generic fallback (only MS is operational)', async () => {
    const token = await login(app, 'student-renach@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/renach/guide?uf=SP')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.uf).toBe('SP');
    expect(
      res.body.data.steps.every((s: string) => !/detran-ms\.gov\.br/i.test(s)),
    ).toBe(true);
  });

  it('POST /renach/me/schedule then /me/done transitions RENACH_PENDING → MEDICAL_PENDING', async () => {
    const token = await login(app, 'student-renach@email.com');

    await request(app.getHttpServer())
      .post('/api/v1/renach/me/schedule')
      .set('Authorization', `Bearer ${token}`)
      .send({ uf: 'MS' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/renach/me/done')
      .set('Authorization', `Bearer ${token}`)
      .send({
        renachNumber: 'RNC-2026-99999',
        biometryDoneAt: new Date().toISOString(),
      })
      .expect(201);

    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('MEDICAL_PENDING');
  });

  it('POST /renach/me/done with malformed renachNumber returns 400', async () => {
    const token = await login(app, 'student-renach@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/renach/me/done')
      .set('Authorization', `Bearer ${token}`)
      .send({
        renachNumber: 'XXX',
        biometryDoneAt: new Date().toISOString(),
      })
      .expect(400);
  });
});

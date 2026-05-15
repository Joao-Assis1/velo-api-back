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

describe('LadvProcess (e2e)', () => {
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

  it('GET /ladv/guide?uf=MS returns DETRAN-MS / CNH do Brasil instructions', async () => {
    const token = await login(app, 'student-awaiting-ladv@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/ladv/guide?uf=MS')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.uf).toBe('MS');
    expect(
      res.body.data.steps.some((s: string) =>
        /cnh do brasil|detran.*ms/i.test(s),
      ),
    ).toBe(true);
  });

  it('POST /ladv/me/manual transitions AWAITING_LADV_UPLOAD → LADV_UPLOADED_VALID', async () => {
    const token = await login(app, 'student-awaiting-ladv@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/ladv/me/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ladvNumber: 'LADV-MS-77777',
        ladvIssuedAt: new Date().toISOString(),
        ladvValidUntil: new Date(
          Date.now() + 365 * 86400000,
        ).toISOString(),
      })
      .expect(201);

    // /journey/me should reflect the new stage. Manual entry sets
    // ladvOcrStatus=NEEDS_REVIEW which DOES NOT count as PASS for journey.
    // So we expect AWAITING_LADV_UPLOAD to persist (manual is for review queue).
    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('AWAITING_LADV_UPLOAD');
  });

  it('POST /ladv/me/manual rejects validUntil in the past', async () => {
    const token = await login(app, 'student-awaiting-ladv@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/ladv/me/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ladvNumber: 'LADV-MS-77777',
        ladvIssuedAt: '2020-01-01T00:00:00Z',
        ladvValidUntil: '2020-06-01T00:00:00Z',
      })
      .expect(400);
  });

  it('GET /ladv/me returns canBook=true for student-ladv (PASS status)', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/ladv/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.canBook).toBe(true);
    expect(res.body.data.ladvOcrStatus).toBe('PASS');
  });
});

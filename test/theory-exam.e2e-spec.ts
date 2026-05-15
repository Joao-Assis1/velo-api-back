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

describe('TheoryExamOfficial (e2e)', () => {
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

  it('POST /theory-exam/me with passed=true transitions THEORY_EXAM_PENDING → AWAITING_LADV_UPLOAD', async () => {
    const token = await login(app, 'student-theory@email.com');

    await request(app.getHttpServer())
      .post('/api/v1/theory-exam/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        takenAt: new Date().toISOString(),
        passed: true,
        score: 28,
      })
      .expect(201);

    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('AWAITING_LADV_UPLOAD');
  });

  it('POST /theory-exam/me with score above 30 returns 400', async () => {
    const token = await login(app, 'student-theory@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/theory-exam/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        takenAt: new Date().toISOString(),
        passed: true,
        score: 99,
      })
      .expect(400);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
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

describe('PsychologicalExam (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let psyClinicId: string;

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
    prisma = app.get(PrismaService);
    const clinic = await prisma.clinic.findFirst({
      where: { type: 'PSYCHOLOGICAL', isActive: true },
    });
    if (!clinic) {
      throw new Error('No PSYCHOLOGICAL clinic seeded');
    }
    psyClinicId = clinic.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('schedule + uploadLaudo transitions PSYCH_PENDING → THEORY_EXAM_PENDING', async () => {
    const token = await login(app, 'student-psych@email.com');

    await request(app.getHttpServer())
      .post('/api/v1/psychological-exam/me/schedule')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clinicId: psyClinicId,
        scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/psychological-exam/me/laudo')
      .set('Authorization', `Bearer ${token}`)
      .field('result', 'APTO')
      .field(
        'validUntil',
        new Date(Date.now() + 365 * 86400000).toISOString(),
      )
      .attach('file', Buffer.from('%PDF-fake'), {
        filename: 'laudo.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('THEORY_EXAM_PENDING');
  });

  it('GET /psychological-exam/me/protocol/pdf returns application/pdf', async () => {
    const token = await login(app, 'student-psych@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/psychological-exam/me/protocol/pdf')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });
});

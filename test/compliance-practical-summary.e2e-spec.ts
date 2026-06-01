import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const login = async (app: INestApplication, email: string): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login/student')
    .send({ email, password: '123456' });
  if (res.status !== 201) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data ? res.body.data.access_token : res.body.access_token;
};

describe('Compliance practical-summary (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns canDeclareReadyForExam=true for student-ready (≥120 valid minutes + LADV PASS)', async () => {
    const token = await login(app, 'student-ready@email.com');
    const student = await prisma.student.findUnique({
      where: { email: 'student-ready@email.com' },
    });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/compliance/students/${student!.id}/practical-summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.meetsMinimumLegal).toBe(true);
    expect(res.body.data.canDeclareReadyForExam).toBe(true);
    expect(res.body.data.totalValidatedMinutes).toBeGreaterThanOrEqual(120);
  });

  it('returns meetsMinimumLegal=false for student-ladv (no lessons yet)', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const student = await prisma.student.findUnique({
      where: { email: 'student-ladv@email.com' },
    });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/compliance/students/${student!.id}/practical-summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.meetsMinimumLegal).toBe(false);
    expect(res.body.data.totalValidatedMinutes).toBe(0);
  });
});

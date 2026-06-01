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

describe('Lessons gate (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let approvedInstructorId: string;

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
    const instructor = await prisma.instructor.findFirst({
      where: { credentialStatus: 'APPROVED' },
    });
    if (!instructor) {
      throw new Error(
        'No APPROVED instructor seeded — review prisma/seed.ts after this sub-plan',
      );
    }
    approvedInstructorId = instructor.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects lesson creation when stage < LADV_UPLOADED_VALID', async () => {
    const token = await login(app, 'student-registered@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: 'placeholder',
        instructorId: approvedInstructorId,
        date: '2026-06-01',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect((res) => {
        if (![400, 401, 403].includes(res.status)) {
          throw new Error(
            `Expected 400/401/403 (journey gate), got ${res.status}`,
          );
        }
      });
  });

  it('rejects when instructor credentialStatus=EXPIRED', async () => {
    const expiredInstructor = await prisma.instructor.findFirst({
      where: { credentialStatus: 'EXPIRED' },
    });
    if (!expiredInstructor) {
      // skipped if seed does not have an EXPIRED instructor
      return;
    }
    const token = await login(app, 'student-ladv@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: 'placeholder',
        instructorId: expiredInstructor.id,
        date: '2026-06-01',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(400);
  });

  it('accepts lesson creation for student-ladv with APPROVED instructor', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const student = await prisma.student.findUnique({
      where: { email: 'student-ladv@email.com' },
    });
    await request(app.getHttpServer())
      .post('/api/v1/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: student?.id,
        instructorId: approvedInstructorId,
        date: '2026-07-01',
        startTime: '14:00',
        endTime: '15:00',
      })
      .expect((res) => {
        if (![200, 201].includes(res.status)) {
          throw new Error(
            `Expected 200/201 for valid lesson, got ${res.status}: ${JSON.stringify(res.body)}`,
          );
        }
      });
  });
});

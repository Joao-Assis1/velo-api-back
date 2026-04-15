import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { randomUUID } from 'crypto';

describe('Student flow (e2e)', () => {
  let app: INestApplication;
  const prefix = '/api/v1';
  const uniqueIdentifier = randomUUID();
  const studentEmail = `student+${uniqueIdentifier}@example.com`;
  const instructorEmail = `instructor+${uniqueIdentifier}@example.com`;
  const studentPassword = 'Password123';
  const instructorPassword = 'Password123';
  let studentId: string;
  let instructorId: string;
  let lessonId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a student and instructor', async () => {
    const studentResponse = await request(app.getHttpServer())
      .post(`${prefix}/auth/register/student`)
      .send({
        email: studentEmail,
        password: studentPassword,
        name: 'Test Student',
      })
      .expect(201);

    expect(studentResponse.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email: studentEmail,
          name: 'Test Student',
        }),
      }),
    );

    studentId = studentResponse.body.user.id;

    const instructorResponse = await request(app.getHttpServer())
      .post(`${prefix}/auth/register/instructor`)
      .send({
        email: instructorEmail,
        password: instructorPassword,
        name: 'Test Instructor',
      })
      .expect(201);

    expect(instructorResponse.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email: instructorEmail,
          name: 'Test Instructor',
        }),
      }),
    );

    instructorId = instructorResponse.body.user.id;
  });

  it('should create a lesson for the student and verify it is persisted', async () => {
    const lessonDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const lessonResponse = await request(app.getHttpServer())
      .post(`${prefix}/lessons`)
      .send({
        studentId,
        instructorId,
        date: lessonDate,
        startTime: '09:00',
        endTime: '10:00',
        price: 150,
      })
      .expect(201);

    expect(lessonResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        studentId,
        instructorId,
        startTime: '09:00',
        endTime: '10:00',
        price: 150,
        status: 'upcoming',
      }),
    );

    lessonId = lessonResponse.body.id;

    const lessonListResponse = await request(app.getHttpServer())
      .get(`${prefix}/lessons`)
      .query({ studentId })
      .expect(200);

    expect(lessonListResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: lessonId,
          studentId,
          instructorId,
          startTime: '09:00',
        }),
      ]),
    );
  });

  it('should create a payment and verify it is saved for the student', async () => {
    const paymentResponse = await request(app.getHttpServer())
      .post(`${prefix}/payments`)
      .send({
        studentId,
        lessonId,
        amount: 150,
      })
      .expect(201);

    expect(paymentResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        studentId,
        lessonId,
        amount: 150,
        status: 'PENDING',
      }),
    );

    const paymentsForStudent = await request(app.getHttpServer())
      .get(`${prefix}/payments`)
      .query({ studentId })
      .expect(200);

    expect(paymentsForStudent.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId,
          lessonId,
          amount: 150,
        }),
      ]),
    );
  });

  it('should update student profile and read it back from the backend', async () => {
    const updatedPhone = '+5511999999999';

    const updateResponse = await request(app.getHttpServer())
      .patch(`${prefix}/students/${studentId}`)
      .send({ phone: updatedPhone })
      .expect(200);

    expect(updateResponse.body).toEqual(
      expect.objectContaining({
        id: studentId,
        phone: updatedPhone,
      }),
    );

    const studentResponse = await request(app.getHttpServer())
      .get(`${prefix}/students/${studentId}`)
      .expect(200);

    expect(studentResponse.body).toEqual(
      expect.objectContaining({
        id: studentId,
        email: studentEmail,
        name: 'Test Student',
        phone: updatedPhone,
      }),
    );
  });
});

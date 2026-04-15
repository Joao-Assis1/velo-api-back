import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

// Increase timeout for full database population tests
jest.setTimeout(90000);

describe('Full Data Population & Validation (e2e)', () => {
  let app: INestApplication;
  const prefix = '/api/v1';
  
  // Human-friendly identifiers for demonstration
  const studentEmail = 'aluno@velo.com.br';
  const instructorEmail = 'instrutor@velo.com.br';
  const password = 'VeloPassword123!';
  
  let studentId: string;
  let instructorId: string;
  let authToken: string;
  let instructorToken: string;
  let vehicleId: string;
  let paymentMethodId: string;
  let lessonId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // We EXPLICITLY set the same configuration as main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    
    await app.init();
  }, 45000);

  afterAll(async () => {
    await app.close();
  });

  describe('Validation Flow', () => {
    it('Step 1: Register Student & Instructor', async () => {
      // Reg Student
      let res = await request(app.getHttpServer())
        .post(`${prefix}/auth/register/student`)
        .send({
          email: studentEmail,
          password: password,
          name: 'João Victor (Aluno)',
          phone: '+5511999991111',
          cpf: '123.456.789-00'
        })
        .expect(HttpStatus.CREATED);
      
      studentId = res.body.data.user.id;
      authToken = res.body.data.access_token;

      // Reg Instructor
      res = await request(app.getHttpServer())
        .post(`${prefix}/auth/register/instructor`)
        .send({
          email: instructorEmail,
          password: password,
          name: 'Pedro Silva (Instrutor)',
          phone: '+5511988882222',
          cpf: '987.654.321-11',
          instructorType: 'B'
        })
        .expect(HttpStatus.CREATED);
      
      instructorId = res.body.data.user.id;
      instructorToken = res.body.data.access_token;
    });

    it('Step 2: Fill Instructor Profile & Assets', async () => {
      // Patch Instructor
      await request(app.getHttpServer())
        .patch(`${prefix}/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          bio: 'Instructor bio with all columns filled for validation.',
          location: 'São Paulo, SP',
          pricePerClass: 150.00,
          cnhNumber: 'CNH123456',
          cnhCategory: 'AD',
          cnhExpiry: '2030-01-01',
          cnhEar: true,
          certidaoNegativa: 'https://docs.test/cert.pdf',
          termsAcceptedAt: new Date().toISOString()
        })
        .expect(HttpStatus.OK);

      // Add Vehicle
      const vehRes = await request(app.getHttpServer())
        .post(`${prefix}/vehicles`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          instructorId,
          plate: 'VELO-2026',
          model: 'VW Polo 2024',
          transmission: 'Automatic',
          year: '2024',
          vehiclePhoto: 'https://images.test/polo.jpg'
        })
        .expect(HttpStatus.CREATED);
      vehicleId = vehRes.body.data.id;

      // Add Availability
      await request(app.getHttpServer())
        .post(`${prefix}/availability`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          instructorId,
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '18:00',
          isEnabled: true
        })
        .expect(HttpStatus.CREATED);
    });

    it('Step 3: Student Prerequisites (LADV & Card)', async () => {
      // LADV
      const tempPath = join(__dirname, 'ladv-demo.pdf');
      writeFileSync(tempPath, 'dummy pdf content');
      await request(app.getHttpServer())
        .post(`${prefix}/students/${studentId}/ladv-upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', tempPath)
        .expect(HttpStatus.CREATED);
      unlinkSync(tempPath);

      // Payment Method
      const pmRes = await request(app.getHttpServer())
        .post(`${prefix}/payment-methods`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId,
          cardNumber: '4111111111111111',
          cardholderName: 'JOAO E COMPLETO',
          expiryMonth: '12',
          expiryYear: '2030',
          cvv: '123'
        });
      
      if (pmRes.status !== 201) {
        console.error('Payment Method Fail Details:', JSON.stringify(pmRes.body, null, 2));
      }
      expect(pmRes.status).toBe(HttpStatus.CREATED);
      paymentMethodId = pmRes.body.data.id;
    });

    it('Step 4: Full Lesson Lifecycle', async () => {
      // Book
      const bookRes = await request(app.getHttpServer())
        .post(`${prefix}/lessons`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId, instructorId, vehicleId,
          date: '2026-06-01T00:00:00.000Z',
          startTime: '09:00', endTime: '10:00', price: 150.00
        })
        .expect(HttpStatus.CREATED);
      lessonId = bookRes.body.data.id;

      // Check-in
      await request(app.getHttpServer())
        .patch(`${prefix}/lessons/${lessonId}/checkin`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(HttpStatus.OK);

      // Check-out
      await request(app.getHttpServer())
        .patch(`${prefix}/lessons/${lessonId}/checkout`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(HttpStatus.OK);

      // Process Payment
      const payRes = await request(app.getHttpServer())
        .post(`${prefix}/payments/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId, lessonId, paymentMethodId, amount: 150.00
        });
      
      if (payRes.status !== 201) {
        console.error('Payment Process Fail:', JSON.stringify(payRes.body, null, 2));
      }
      expect(payRes.status).toBe(HttpStatus.CREATED);
      expect(payRes.body.data.status).toBe('COMPLETED');
    });

    it('Step 5: Final Database Integrity Validation', async () => {
      // Check Student
      const sRes = await request(app.getHttpServer())
        .get(`${prefix}/students/${studentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);
      
      const s = sRes.body.data;
      expect(s.paymentMethods.length).toBeGreaterThan(0);
      expect(s.ladvUploaded).toBe(true);
      expect(s.cpf).toBe('123.456.789-00');

      // Check Instructor
      const iRes = await request(app.getHttpServer())
        .get(`${prefix}/instructors/${instructorId}`)
        .expect(HttpStatus.OK);
      
      const i = iRes.body.data;
      expect(i.vehicles.length).toBeGreaterThan(0);
      expect(i.availabilities.length).toBeGreaterThan(0);
      expect(i.pricePerClass).toBe(150.00);
      expect(i.cnhEar).toBe(true);
    });
  });
});

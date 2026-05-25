import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const login = async (app: INestApplication, email: string): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: '123456' });
  return res.body.data?.token ?? res.body.token;
};

describe('Clinics (e2e)', () => {
  let app: INestApplication;
  let token: string;

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
    token = await login(app, 'gabriel@email.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /clinics?type=MEDICAL&uf=MS returns 3 medical clinics in Campo Grande', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/clinics?type=MEDICAL&uf=MS')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.items).toHaveLength(3);
    expect(
      res.body.data.items.every(
        (c: { type: string; uf: string; city: string }) =>
          c.type === 'MEDICAL' && c.uf === 'MS' && c.city === 'Campo Grande',
      ),
    ).toBe(true);
  });

  it('GET /clinics?type=PSYCHOLOGICAL&city=Campo Grande returns 3 clinics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/clinics')
      .query({ type: 'PSYCHOLOGICAL', city: 'Campo Grande' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.total).toBe(3);
    expect(
      res.body.data.items.every(
        (c: { type: string; city: string }) =>
          c.type === 'PSYCHOLOGICAL' && c.city === 'Campo Grande',
      ),
    ).toBe(true);
  });

  it('GET /clinics?uf=SP returns 0 (only MS is operational)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/clinics?uf=SP')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('GET /clinics with no filters returns paginated list with pageSize default 20', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/clinics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.pageSize).toBe(20);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(6);
  });

  it('GET /clinics/:id returns a single clinic', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/clinics?type=MEDICAL')
      .set('Authorization', `Bearer ${token}`);
    const someId = list.body.data.items[0].id as string;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/clinics/${someId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.id).toBe(someId);
  });

  it('GET /clinics/missing returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/clinics/non-existing-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});

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

describe('Validation (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let originalFetch: typeof fetch;

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
    originalFetch = global.fetch;
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await app.close();
  });

  it('POST /validation/cpf returns valid=true for a known good CPF', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/cpf')
      .set('Authorization', `Bearer ${token}`)
      .send({ cpf: '111.444.777-35' })
      .expect(201);
    expect(res.body.data.valid).toBe(true);
  });

  it('POST /validation/cpf returns valid=false for an invalid CPF', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/cpf')
      .set('Authorization', `Bearer ${token}`)
      .send({ cpf: '00000000000' })
      .expect(201);
    expect(res.body.data.valid).toBe(false);
  });

  it('POST /validation/cnh returns VALID for the whitelisted mock number', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/cnh')
      .set('Authorization', `Bearer ${token}`)
      .send({ cnhNumber: '02650306461', cpf: '11144477735' })
      .expect(201);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.status).toBe('VALID');
  });

  it('POST /validation/cep returns address fields for 01310-100 (ViaCEP stubbed)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    }) as unknown as typeof fetch;

    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/cep')
      .set('Authorization', `Bearer ${token}`)
      .send({ cep: '01310-100' })
      .expect(201);
    expect(res.body.data.uf).toBe('SP');
    expect(res.body.data.cidade).toBe('São Paulo');
  });

  it('POST /validation/vehicle-plate returns brand/model/year (BrasilAPI stubbed)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        marca: 'HYUNDAI',
        modelo: 'HB20',
        ano: 2023,
      }),
    }) as unknown as typeof fetch;

    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/vehicle-plate')
      .set('Authorization', `Bearer ${token}`)
      .send({ plate: 'ABC1D23' })
      .expect(201);
    expect(res.body.data.marca).toBe('HYUNDAI');
    expect(res.body.data.modelo).toBe('HB20');
  });
});

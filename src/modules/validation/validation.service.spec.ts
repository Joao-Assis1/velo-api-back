import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { DOCUMENT_VALIDATION_PROVIDER } from './providers/document-validation.provider';
import { ConfigService } from '@nestjs/config';

describe('ValidationService', () => {
  let service: ValidationService;
  let provider: { validateCnh: jest.Mock; validateRenach: jest.Mock };
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    originalFetch = global.fetch;
    provider = {
      validateCnh: jest.fn(),
      validateRenach: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        { provide: DOCUMENT_VALIDATION_PROVIDER, useValue: provider },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'VIA_CEP_BASE_URL') return 'https://viacep.com.br/ws';
              if (key === 'BRASIL_API_BASE_URL')
                return 'https://brasilapi.com.br/api';
              return undefined;
            },
          },
        },
      ],
    }).compile();
    service = module.get(ValidationService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('validateCpf', () => {
    it('returns valid=true and normalized for a valid CPF', () => {
      const r = service.validateCpf('111.444.777-35');
      expect(r.valid).toBe(true);
      expect(r.normalized).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    });

    it('returns valid=false for malformed CPF', () => {
      const r = service.validateCpf('00000000000');
      expect(r.valid).toBe(false);
    });
  });

  describe('validateCnh', () => {
    it('rejects locally invalid CNH without calling external provider', async () => {
      const r = await service.validateCnh('11111111111', '11144477735');
      expect(r.valid).toBe(false);
      expect(r.status).toBe('LOCAL_INVALID');
      expect(provider.validateCnh).not.toHaveBeenCalled();
    });

    it('returns local-only result when provider is disabled', async () => {
      provider.validateCnh.mockResolvedValue({
        valid: true,
        status: 'VALID',
      });
      const r = await service.validateCnh('02650306461', '11144477735');
      expect(r.valid).toBe(true);
      expect(provider.validateCnh).toHaveBeenCalledWith(
        '02650306461',
        '11144477735',
      );
    });
  });

  describe('validateCep', () => {
    it('returns address fields for a valid CEP', async () => {
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

      const r = await service.validateCep('01310100');
      expect(r).toEqual({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        uf: 'SP',
      });
    });

    it('throws NotFoundException when ViaCEP returns erro=true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ erro: true }),
      }) as unknown as typeof fetch;
      await expect(service.validateCep('99999999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException on network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
      await expect(service.validateCep('01310100')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateVehiclePlate', () => {
    it('returns brand/model/year for an existing plate', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          marca: 'HYUNDAI',
          modelo: 'HB20',
          ano: 2023,
        }),
      }) as unknown as typeof fetch;
      const r = await service.validateVehiclePlate('ABC1D23');
      expect(r).toEqual({ marca: 'HYUNDAI', modelo: 'HB20', ano: 2023 });
    });

    it('throws NotFoundException for non-existing plate', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'not found' }),
      }) as unknown as typeof fetch;
      await expect(service.validateVehiclePlate('XYZ9Z99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

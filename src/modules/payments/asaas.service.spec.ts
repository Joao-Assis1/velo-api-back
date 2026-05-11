import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AsaasService } from './asaas.service';

const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'ASAAS_API_KEY') return 'test_api_key';
    if (key === 'ASAAS_BASE_URL') return 'https://sandbox.asaas.com/api/v3';
    return undefined;
  }),
};

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} as any };
}

describe('AsaasService', () => {
  let service: AsaasService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsaasService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AsaasService>(AsaasService);
  });

  describe('createCustomer', () => {
    it('should POST to /customers and return id', async () => {
      mockHttpService.post.mockReturnValue(of(axiosResponse({ id: 'cus_123' })));

      const result = await service.createCustomer({
        name: 'Test User',
        email: 'test@email.com',
      });

      expect(result).toEqual({ id: 'cus_123' });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/customers',
        { name: 'Test User', email: 'test@email.com' },
        { headers: { access_token: 'test_api_key' } },
      );
    });
  });

  describe('tokenizeCreditCard', () => {
    it('should POST to /creditCard/tokenize and return token', async () => {
      mockHttpService.post.mockReturnValue(
        of(axiosResponse({ creditCardToken: 'tok_abc' })),
      );

      const dto = {
        creditCard: {
          holderName: 'Test',
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
        },
        creditCardHolderInfo: {
          name: 'Test',
          email: 'test@email.com',
          cpfCnpj: '12345678909',
          postalCode: '01310100',
          addressNumber: '100',
        },
        customer: 'cus_123',
        remoteIp: '127.0.0.1',
      };

      const result = await service.tokenizeCreditCard(dto);

      expect(result).toEqual({ creditCardToken: 'tok_abc' });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/creditCard/tokenize',
        dto,
        { headers: { access_token: 'test_api_key' } },
      );
    });
  });

  describe('createCharge', () => {
    it('should POST to /payments and return charge', async () => {
      mockHttpService.post.mockReturnValue(
        of(axiosResponse({ id: 'pay_456', status: 'PENDING' })),
      );

      const dto = {
        customer: 'cus_123',
        billingType: 'CREDIT_CARD' as const,
        value: 150,
        dueDate: '2026-06-01',
        creditCardToken: 'tok_abc',
      };

      const result = await service.createCharge(dto);

      expect(result).toEqual({ id: 'pay_456', status: 'PENDING' });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/payments',
        dto,
        { headers: { access_token: 'test_api_key' } },
      );
    });
  });

  describe('getCharge', () => {
    it('should GET /payments/:id and return charge', async () => {
      mockHttpService.get.mockReturnValue(
        of(axiosResponse({ id: 'pay_456', status: 'CONFIRMED', value: 100 })),
      );

      const result = await service.getCharge('pay_456');

      expect(result).toEqual({ id: 'pay_456', status: 'CONFIRMED', value: 100 });
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/payments/pay_456',
        { headers: { access_token: 'test_api_key' } },
      );
    });
  });

  describe('refundCharge', () => {
    it('should POST to /payments/:id/refund and return refunded charge', async () => {
      mockHttpService.post.mockReturnValue(
        of(axiosResponse({ id: 'pay_456', status: 'REFUNDED' })),
      );

      const result = await service.refundCharge('pay_456');

      expect(result).toEqual({ id: 'pay_456', status: 'REFUNDED' });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/payments/pay_456/refund',
        undefined,
        { headers: { access_token: 'test_api_key' } },
      );
    });
  });

  describe('createTransfer', () => {
    it('should POST to /transfers and return transfer', async () => {
      mockHttpService.post.mockReturnValue(
        of(axiosResponse({ id: 'tra_789', status: 'PENDING' })),
      );

      const dto = {
        value: 200,
        pixAddressKey: 'instructor@email.com',
        pixAddressKeyType: 'EMAIL' as const,
      };

      const result = await service.createTransfer(dto);

      expect(result).toEqual({ id: 'tra_789', status: 'PENDING' });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://sandbox.asaas.com/api/v3/transfers',
        dto,
        { headers: { access_token: 'test_api_key' } },
      );
    });
  });

  describe('error handling', () => {
    it('should throw BadGatewayException on HTTP error', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: { errors: [{ description: 'Invalid customer' }] },
        },
        message: 'Request failed',
      };

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(
        service.createCustomer({ name: 'Test', email: 'bad@email.com' }),
      ).rejects.toThrow(BadGatewayException);

      await expect(
        service.createCustomer({ name: 'Test', email: 'bad@email.com' }),
      ).rejects.toThrow('Asaas error [400]: Invalid customer');
    });

    it('should throw BadGatewayException with fallback message on generic error', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => ({ message: 'Network error' })),
      );

      await expect(service.getCharge('pay_xxx')).rejects.toThrow(BadGatewayException);
    });
  });

  describe('handleWebhook', () => {
    it('should return success true', async () => {
      const result = await service.handleWebhook({
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_123' },
      });
      expect(result).toEqual({ success: true });
    });
  });
});

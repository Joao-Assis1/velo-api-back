import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsaasClient, ASAAS_CLIENT, asaasClientProvider } from './asaas.client';

// Helper to create a mock Response-like object
function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('AsaasClient', () => {
  let client: AsaasClient;
  let fetchSpy: jest.SpyInstance;

  const mockConfig = {
    ASAAS_API_KEY: 'test-api-key-123',
    ASAAS_BASE_URL: 'https://sandbox.asaas.com/api',
    ASAAS_WEBHOOK_TOKEN: 'webhook-secret-token',
  };

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => mockConfig[key as keyof typeof mockConfig]),
    } as unknown as ConfigService;

    client = new AsaasClient(configService);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Provider', () => {
    it('deve exportar o token ASAAS_CLIENT como símbolo', () => {
      expect(typeof ASAAS_CLIENT).toBe('symbol');
    });

    it('asaasClientProvider deve ter provide, inject e useFactory', () => {
      expect(asaasClientProvider.provide).toBe(ASAAS_CLIENT);
      expect(asaasClientProvider.inject).toContain(ConfigService);
      expect(typeof asaasClientProvider.useFactory).toBe('function');
    });
  });

  describe('Headers', () => {
    it('deve montar header access_token em toda requisição', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ id: 'cus_123' }));

      await client.getCustomer('cus_123');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v3/customers/cus_123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            access_token: 'test-api-key-123',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('deve incluir idempotencyKey no header quando fornecido', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({ id: 'pay_123', status: 'PENDING' }),
      );

      await client.charge(
        {
          customer: 'cus_123',
          billingType: 'CREDIT_CARD',
          value: 100,
          dueDate: '2026-06-05',
          creditCardToken: 'tok_123',
        },
        'idem-key-abc',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'idem-key-abc',
          }),
        }),
      );
    });

    it('NÃO deve incluir idempotencyKey quando não fornecido', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({ id: 'pay_123', status: 'PENDING' }),
      );

      await client.charge({
        customer: 'cus_123',
        billingType: 'CREDIT_CARD',
        value: 100,
        dueDate: '2026-06-05',
        creditCardToken: 'tok_123',
      });

      const callArgs = fetchSpy.mock.calls[0][1] as RequestInit & {
        headers: Record<string, string>;
      };
      expect(callArgs.headers).not.toHaveProperty('Idempotency-Key');
    });
  });

  describe('Tratamento de erros', () => {
    it('deve lançar BadRequestException com a descrição quando resposta 4xx contém errors[]', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse(
          {
            errors: [{ code: 'invalid_card', description: 'Cartão inválido' }],
          },
          400,
        ),
      );

      await expect(client.getCustomer('cus_bad')).rejects.toThrow(
        new BadRequestException('Cartão inválido'),
      );
    });

    it('deve lançar BadRequestException genérico pt-BR quando resposta 4xx não tem errors[]', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({ message: 'something went wrong' }, 422),
      );

      await expect(client.getCustomer('cus_bad')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException com mensagem em pt-BR quando errors[] está vazio', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ errors: [] }, 400));

      await expect(client.getCustomer('cus_bad')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyWebhookToken', () => {
    it('deve retornar true quando o token bate com ASAAS_WEBHOOK_TOKEN', () => {
      expect(client.verifyWebhookToken('webhook-secret-token')).toBe(true);
    });

    it('deve retornar false quando o token não bate', () => {
      expect(client.verifyWebhookToken('wrong-token')).toBe(false);
    });

    it('deve retornar false quando o token está vazio', () => {
      expect(client.verifyWebhookToken('')).toBe(false);
    });
  });

  describe('charge', () => {
    it('deve montar payload correto com billingType CREDIT_CARD e creditCardToken', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({ id: 'pay_abc', status: 'PENDING' }),
      );

      const result = await client.charge({
        customer: 'cus_123',
        billingType: 'CREDIT_CARD',
        value: 150.5,
        dueDate: '2026-06-10',
        creditCardToken: 'tok_xyz',
        description: 'Aula de direção',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v3/payments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            customer: 'cus_123',
            billingType: 'CREDIT_CARD',
            value: 150.5,
            dueDate: '2026-06-10',
            creditCardToken: 'tok_xyz',
            description: 'Aula de direção',
          }),
        }),
      );
      expect(result).toEqual({ id: 'pay_abc', status: 'PENDING' });
    });
  });

  describe('transferPix', () => {
    it('deve montar payload correto com pixAddressKey e pixAddressKeyType', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({ id: 'tr_123', status: 'PENDING' }),
      );

      const result = await client.transferPix(
        {
          value: 80,
          pixAddressKey: '123.456.789-00',
          pixAddressKeyType: 'CPF',
          description: 'Repasse instrutor',
        },
        'idem-transfer-key',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v3/transfers'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            value: 80,
            pixAddressKey: '123.456.789-00',
            pixAddressKeyType: 'CPF',
            description: 'Repasse instrutor',
          }),
          headers: expect.objectContaining({
            'Idempotency-Key': 'idem-transfer-key',
          }),
        }),
      );
      expect(result).toEqual({ id: 'tr_123', status: 'PENDING' });
    });
  });

  describe('refund', () => {
    it('deve chamar POST /v3/payments/{id}/refund com idempotencyKey', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({ id: 'pay_123', status: 'REFUNDED' }),
      );

      const result = await client.refund('pay_123', 'refund-idem-key');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v3/payments/pay_123/refund'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Idempotency-Key': 'refund-idem-key',
          }),
        }),
      );
      expect(result).toEqual({ id: 'pay_123', status: 'REFUNDED' });
    });
  });

  describe('createCustomer', () => {
    it('deve enviar POST /v3/customers com name, email e cpfCnpj', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ id: 'cus_new' }));

      const result = await client.createCustomer({
        name: 'João Silva',
        email: 'joao@example.com',
        cpfCnpj: '123.456.789-00',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v3/customers'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'João Silva',
            email: 'joao@example.com',
            cpfCnpj: '123.456.789-00',
          }),
        }),
      );
      expect(result).toEqual({ id: 'cus_new' });
    });
  });

  describe('tokenizeCard', () => {
    it('deve enviar POST /v3/creditCard/tokenize com dados completos', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({
          creditCardToken: 'tok_card',
          creditCardBrand: 'VISA',
          creditCardNumber: '411111',
        }),
      );

      const input = {
        customer: 'cus_123',
        creditCard: {
          holderName: 'JOAO SILVA',
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2028',
          ccv: '123',
        },
        creditCardHolderInfo: {
          name: 'João Silva',
          email: 'joao@example.com',
          cpfCnpj: '123.456.789-00',
          postalCode: '01310-100',
          addressNumber: '100',
          phone: '11999999999',
        },
      };

      const result = await client.tokenizeCard(input);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v3/creditCard/tokenize'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        }),
      );
      expect(result).toEqual({
        creditCardToken: 'tok_card',
        creditCardBrand: 'VISA',
        creditCardNumber: '411111',
      });
    });
  });
});

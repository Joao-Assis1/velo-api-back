import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const ASAAS_CLIENT = Symbol('ASAAS_CLIENT');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenizeCardInput {
  customer: string;
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

export interface ChargeInput {
  customer: string;
  billingType: 'CREDIT_CARD';
  value: number;
  dueDate: string; // YYYY-MM-DD
  creditCardToken: string;
  description?: string;
}

export interface TransferPixInput {
  value: number;
  pixAddressKey: string;
  pixAddressKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
  description?: string;
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export const asaasClientProvider = {
  provide: ASAAS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): AsaasClient => {
    return new AsaasClient(config);
  },
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

@Injectable()
export class AsaasClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly webhookToken: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ASAAS_API_KEY');
    if (!apiKey) throw new Error('ASAAS_API_KEY está ausente');

    const webhookToken = config.get<string>('ASAAS_WEBHOOK_TOKEN');
    if (!webhookToken) throw new Error('ASAAS_WEBHOOK_TOKEN está ausente');

    this.apiKey = apiKey;
    this.baseUrl =
      config.get<string>('ASAAS_BASE_URL') ?? 'https://sandbox.asaas.com/api';
    this.webhookToken = webhookToken;
  }

  // -------------------------------------------------------------------------
  // Internal request helper
  // -------------------------------------------------------------------------

  private buildHeaders(idempotencyKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      access_token: this.apiKey,
      'Content-Type': 'application/json',
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.buildHeaders(idempotencyKey),
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const errors = (
        data as { errors?: { code: string; description: string }[] }
      ).errors;
      if (errors && errors.length > 0) {
        throw new BadRequestException(errors[0].description);
      }
      throw new BadRequestException('Erro na requisição ao Asaas');
    }

    return data as T;
  }

  // -------------------------------------------------------------------------
  // Public methods
  // -------------------------------------------------------------------------

  async tokenizeCard(input: TokenizeCardInput): Promise<{
    creditCardToken: string;
    creditCardBrand: string;
    creditCardNumber: string;
  }> {
    return this.request('POST', '/v3/creditCard/tokenize', input);
  }

  async createCustomer(input: {
    name: string;
    email: string;
    cpfCnpj: string;
  }): Promise<{ id: string }> {
    return this.request('POST', '/v3/customers', input);
  }

  async getCustomer(
    id: string,
  ): Promise<{ id: string; name: string; email: string }> {
    return this.request('GET', `/v3/customers/${id}`);
  }

  async charge(
    input: ChargeInput,
    idempotencyKey?: string,
  ): Promise<{ id: string; status: string }> {
    return this.request('POST', '/v3/payments', input, idempotencyKey);
  }

  async refund(
    paymentId: string,
    idempotencyKey?: string,
  ): Promise<{ id: string; status: string }> {
    return this.request(
      'POST',
      `/v3/payments/${paymentId}/refund`,
      undefined,
      idempotencyKey,
    );
  }

  async transferPix(
    input: TransferPixInput,
    idempotencyKey?: string,
  ): Promise<{ id: string; status: string }> {
    return this.request('POST', '/v3/transfers', input, idempotencyKey);
  }

  verifyWebhookToken(headerToken: string): boolean {
    return !!headerToken && headerToken === this.webhookToken;
  }
}

// ---------------------------------------------------------------------------
// Holder (for injection via ASAAS_CLIENT token)
// ---------------------------------------------------------------------------

@Injectable()
export class AsaasClientHolder {
  constructor(@Inject(ASAAS_CLIENT) public readonly asaas: AsaasClient) {}
}

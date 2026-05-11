import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AsaasCreateChargeDto,
  AsaasCustomerDto,
  AsaasTokenizeCardDto,
  AsaasTransferDto,
} from './asaas.types';

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('ASAAS_API_KEY') ?? '';
    this.baseUrl =
      this.configService.get<string>('ASAAS_BASE_URL') ??
      'https://sandbox.asaas.com/api/v3';

    if (!this.apiKey) {
      this.logger.error('ASAAS_API_KEY not found in environment');
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = { access_token: this.apiKey };

    try {
      const observable =
        method === 'GET'
          ? this.httpService.get<T>(url, { headers })
          : this.httpService.post<T>(url, body, { headers });

      const response = await firstValueFrom(observable);
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.errors?.[0]?.description ??
        err?.response?.data?.message ??
        err?.message ??
        'Asaas API error';

      this.logger.error(`Asaas ${method} ${path} failed [${status}]: ${message}`);
      throw new BadGatewayException(`Asaas error [${status}]: ${message}`);
    }
  }

  async createCustomer(
    dto: AsaasCustomerDto,
  ): Promise<{ id: string; [key: string]: any }> {
    this.logger.log(`Creating Asaas customer: ${dto.email}`);
    return this.request('POST', '/customers', dto);
  }

  async tokenizeCreditCard(
    dto: AsaasTokenizeCardDto,
  ): Promise<{ creditCardToken: string; [key: string]: any }> {
    this.logger.log(`Tokenizing credit card for customer: ${dto.customer}`);
    return this.request('POST', '/creditCard/tokenize', dto);
  }

  async createCharge(
    dto: AsaasCreateChargeDto,
  ): Promise<{ id: string; status: string; [key: string]: any }> {
    this.logger.log(`Creating charge for customer: ${dto.customer}`);
    return this.request('POST', '/payments', dto);
  }

  async getCharge(
    asaasId: string,
  ): Promise<{ id: string; status: string; value: number; [key: string]: any }> {
    return this.request('GET', `/payments/${asaasId}`);
  }

  async refundCharge(
    asaasId: string,
  ): Promise<{ id: string; status: string; [key: string]: any }> {
    this.logger.log(`Refunding charge: ${asaasId}`);
    return this.request('POST', `/payments/${asaasId}/refund`);
  }

  async createTransfer(
    dto: AsaasTransferDto,
  ): Promise<{ id: string; status: string; [key: string]: any }> {
    this.logger.log(`Creating transfer of value: ${dto.value}`);
    return this.request('POST', '/transfers', dto);
  }

  async handleWebhook(body: any) {
    const { event, payment } = body;
    this.logger.log(`Received Asaas Webhook: ${event} for payment ${payment.id}`);
    return { success: true };
  }
}

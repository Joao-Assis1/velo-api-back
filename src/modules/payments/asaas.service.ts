import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('ASAAS_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.error('ASAAS_API_KEY not found in environment');
    }
  }

  async handleWebhook(body: any) {
    const { event, payment } = body;
    this.logger.log(`Received Asaas Webhook: ${event} for payment ${payment.id}`);

    // C-015: Idempotência
    const existingPayment = await this.prisma.payment.findUnique({
      where: { asaasId: payment.id },
    });

    if (existingPayment && existingPayment.status === 'COMPLETED') {
      this.logger.warn(`Payment ${payment.id} already processed. Skipping.`);
      return { success: true, alreadyProcessed: true };
    }

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      await this.prisma.payment.upsert({
        where: { asaasId: payment.id },
        update: {
          status: 'COMPLETED',
        },
        create: {
          asaasId: payment.id,
          amount: payment.value,
          status: 'COMPLETED',
          studentId: payment.externalReference, // Assumindo que passamos o studentId no externalReference
        },
      });
    }

    return { success: true };
  }
}

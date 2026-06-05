import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from '../payments-stripe/stripe.client';
import { idempotencyKey } from '../payments-stripe/lib/idempotency';
import { CreatePaymentMethodDto } from './dtos';

type StripeInstance = InstanceType<typeof Stripe>;
const SEED_PM = 'pm_card_visa';

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeInstance,
  ) {}

  async addCard(studentId: string, dto: CreatePaymentMethodDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!student) throw new NotFoundException(`Aluno ${studentId} não encontrado`);

    let customerId = student.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        { email: student.email, name: student.name, metadata: { studentId } },
        { idempotencyKey: idempotencyKey(studentId, 'connect-account') },
      );
      customerId = customer.id;
      await this.prisma.student.update({
        where: { id: studentId },
        data: { stripeCustomerId: customerId },
      });
    }

    type PM = Awaited<ReturnType<StripeInstance['paymentMethods']['create']>>;
    let pm: PM;
    try {
      pm = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: dto.cardNumber.replace(/\s/g, ''),
          exp_month: parseInt(dto.expiryMonth, 10),
          exp_year: parseInt(dto.expiryYear, 10),
          cvc: dto.cvv,
        },
        billing_details: { name: dto.cardholderName },
      });
    } catch (err: any) {
      throw new BadRequestException(
        err?.message ?? 'Dados do cartão inválidos',
      );
    }

    await this.stripe.paymentMethods.attach(pm.id, { customer: customerId });

    const activeCount = await this.prisma.paymentMethod.count({
      where: { studentId, isDeleted: false },
    });

    const row = await this.prisma.paymentMethod.create({
      data: {
        studentId,
        stripePaymentMethodId: pm.id,
        brand: pm.card!.brand,
        last4: pm.card!.last4,
        cardholderName: dto.cardholderName,
        expiryMonth: dto.expiryMonth.padStart(2, '0'),
        expiryYear: dto.expiryYear,
        isDefault: dto.isDefault ?? activeCount === 0,
      },
    });

    return { paymentMethod: row };
  }

  async findAll(studentId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { studentId, isDeleted: false },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        stripePaymentMethodId: true,
        brand: true,
        last4: true,
        cardholderName: true,
        expiryMonth: true,
        expiryYear: true,
        isDefault: true,
      },
    });
  }

  async seedTest(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!student) throw new NotFoundException(`Aluno ${studentId} não encontrado`);

    let customerId = student.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        { email: student.email, name: student.name, metadata: { studentId } },
        { idempotencyKey: idempotencyKey(studentId, 'connect-account') },
      );
      customerId = customer.id;
      await this.prisma.student.update({
        where: { id: studentId },
        data: { stripeCustomerId: customerId },
      });
    }

    type PM = Awaited<ReturnType<StripeInstance['paymentMethods']['retrieve']>>;
    let pm: PM;
    try {
      pm = await this.stripe.paymentMethods.attach(
        SEED_PM,
        { customer: customerId },
        { idempotencyKey: idempotencyKey(studentId, 'seed-payment-method') },
      );
    } catch (err: any) {
      // pm_card_visa already attached to this customer — retrieve it instead
      if (err?.code === 'payment_method_already_attached') {
        pm = await this.stripe.paymentMethods.retrieve(SEED_PM);
      } else {
        throw err;
      }
    }

    // Return existing record if already seeded (avoids unique constraint violation)
    const existingRecord = await this.prisma.paymentMethod.findFirst({
      where: { studentId, stripePaymentMethodId: pm.id },
    });
    if (existingRecord) {
      if (existingRecord.isDeleted) {
        const restored = await this.prisma.paymentMethod.update({
          where: { id: existingRecord.id },
          data: { isDeleted: false },
        });
        return { paymentMethod: restored };
      }
      return { paymentMethod: existingRecord };
    }

    const activeCount = await this.prisma.paymentMethod.count({
      where: { studentId, isDeleted: false },
    });

    const row = await this.prisma.paymentMethod.create({
      data: {
        studentId,
        stripePaymentMethodId: pm.id,
        brand: pm.card!.brand,
        last4: pm.card!.last4,
        cardholderName: pm.billing_details?.name ?? student.name,
        expiryMonth: String(pm.card!.exp_month).padStart(2, '0'),
        expiryYear: String(pm.card!.exp_year),
        isDefault: activeCount === 0,
      },
    });

    return { paymentMethod: row };
  }

  async remove(studentId: string, id: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Método de pagamento não encontrado');

    await this.prisma.paymentMethod.update({
      where: { id },
      data: { isDeleted: true, isDefault: false },
    });

    if (pm.isDefault) {
      const next = await this.prisma.paymentMethod.findFirst({
        where: { studentId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.paymentMethod.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return { ok: true };
  }

  async setDefault(studentId: string, id: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Método de pagamento não encontrado');
    await this.prisma.$transaction([
      this.prisma.paymentMethod.updateMany({
        where: { studentId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
    return { ok: true };
  }
}

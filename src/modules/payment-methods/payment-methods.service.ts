import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from '../payments-stripe/stripe.client';
import { idempotencyKey } from '../payments-stripe/lib/idempotency';

type StripeInstance = InstanceType<typeof Stripe>;
const SEED_PM = 'pm_card_visa';

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeInstance,
  ) {}

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
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    let customerId = student.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        { email: student.email, name: student.name, metadata: { studentId } },
        { idempotencyKey: idempotencyKey(studentId, 'connect-account') },
      );
      customerId = customer.id;
      await this.prisma.student.update({ where: { id: studentId }, data: { stripeCustomerId: customerId } });
    }

    const pm = await this.stripe.paymentMethods.attach(
      SEED_PM,
      { customer: customerId },
      { idempotencyKey: idempotencyKey(studentId, 'seed-payment-method') },
    );

    const existing = await this.prisma.paymentMethod.findMany({
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
        isDefault: existing.length === 0,
      },
    });

    return { paymentMethod: row };
  }

  async setDefault(studentId: string, id: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Payment method not found');
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

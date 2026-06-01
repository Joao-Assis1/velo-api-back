import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.client';

type StripeInstance = InstanceType<typeof Stripe>;

import { idempotencyKey } from './lib/idempotency';
import {
  AttachPaymentMethodDto,
  PaymentMethodResponseDto,
} from './dto/payment-method.dto';
import { SetupIntentResponseDto } from './dto/setup-intent-response.dto';

@Injectable()
export class PaymentsStripeService {
  private readonly logger = new Logger(PaymentsStripeService.name);

  private computeSplit(totalAmount: number): {
    platformFeeAmount: number;
    instructorAmount: number;
    instructorAmountCents: number;
  } {
    const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 20) / 100;
    const platformFeeAmount = totalAmount * feePercent;
    const instructorAmount = totalAmount - platformFeeAmount;
    return {
      platformFeeAmount,
      instructorAmount,
      instructorAmountCents: Math.round(instructorAmount * 100),
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeInstance,
  ) {}

  async createSetupIntent(studentId: string): Promise<SetupIntentResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    let customerId: string | null = student.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        {
          email: student.email,
          name: student.name,
          metadata: { studentId: student.id },
        },
        { idempotencyKey: idempotencyKey(student.id, 'connect-account') },
      );
      customerId = customer.id;
      await this.prisma.student.update({
        where: { id: student.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return {
      clientSecret: setupIntent.client_secret as string,
      customerId: customerId,
    };
  }

  async provisionCustomer(
    studentId: string,
    email: string,
    name: string,
  ): Promise<void> {
    const customer = await this.stripe.customers.create(
      { email, name, metadata: { studentId } },
      { idempotencyKey: idempotencyKey(studentId, 'connect-account') },
    );
    await this.prisma.student.update({
      where: { id: studentId },
      data: { stripeCustomerId: customer.id },
    });
  }

  async attachPaymentMethod(
    studentId: string,
    dto: AttachPaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { stripeCustomerId: true },
    });
    if (!student?.stripeCustomerId) {
      throw new BadRequestException(
        'Call POST /payments-stripe/setup-intent first to create a Stripe customer',
      );
    }

    await this.stripe.paymentMethods.attach(
      dto.stripePaymentMethodId,
      { customer: student.stripeCustomerId },
      {
        idempotencyKey: idempotencyKey(
          dto.stripePaymentMethodId,
          'attach-payment-method',
        ),
      },
    );

    const pm = await this.stripe.paymentMethods.retrieve(
      dto.stripePaymentMethodId,
    );
    if (!pm.card) {
      throw new BadRequestException('Only card payment methods are supported');
    }

    const activeCount = await this.prisma.paymentMethod.count({
      where: { studentId, isDeleted: false },
    });
    const isDefault = activeCount === 0;

    const softDeleted = await this.prisma.paymentMethod.findFirst({
      where: { studentId, stripePaymentMethodId: pm.id },
    });

    let row;
    if (softDeleted) {
      row = await this.prisma.paymentMethod.update({
        where: { id: softDeleted.id },
        data: {
          isDeleted: false,
          isDefault,
          brand: pm.card.brand,
          last4: pm.card.last4,
          cardholderName:
            pm.billing_details?.name ?? softDeleted.cardholderName,
          expiryMonth: String(pm.card.exp_month).padStart(2, '0'),
          expiryYear: String(pm.card.exp_year),
        },
      });
    } else {
      row = await this.prisma.paymentMethod.create({
        data: {
          studentId,
          stripePaymentMethodId: pm.id,
          brand: pm.card.brand,
          last4: pm.card.last4,
          cardholderName: pm.billing_details?.name ?? 'UNKNOWN',
          expiryMonth: String(pm.card.exp_month).padStart(2, '0'),
          expiryYear: String(pm.card.exp_year),
          isDefault,
        },
      });
    }
    return row as unknown as PaymentMethodResponseDto;
  }

  async detachPaymentMethod(studentId: string, rowId: string): Promise<void> {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id: rowId, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Payment method not found');

    await this.stripe.paymentMethods.detach(
      pm.stripePaymentMethodId,
      {},
      {
        idempotencyKey: idempotencyKey(
          pm.stripePaymentMethodId,
          'detach-payment-method',
        ),
      },
    );
    await this.prisma.paymentMethod.update({
      where: { id: rowId },
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
  }

  async charge(
    studentId: string,
    dto: { lessonId: string; paymentMethodId: string },
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.studentId !== studentId) {
      throw new BadRequestException('Lesson does not belong to this student');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { lessonId: dto.lessonId },
    });
    if (existing) {
      this.logger.log(
        `Lesson ${dto.lessonId} already has Payment ${existing.id} (${existing.status}) — returning idempotently`,
      );
      return existing;
    }

    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id: dto.paymentMethodId, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Payment method not found');

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { stripeCustomerId: true },
    });
    if (!student?.stripeCustomerId) {
      throw new BadRequestException(
        'Student has no Stripe customer — call /setup-intent first',
      );
    }

    const instructor = await this.prisma.instructor.findUnique({
      where: { id: lesson.instructorId },
    });
    if (!instructor) throw new BadRequestException('Instructor not found');
    if (instructor.stripeAccountStatus !== 'ACTIVE') {
      throw new BadRequestException(
        `Instructor Stripe Connect status is ${instructor.stripeAccountStatus} — charges only allowed for ACTIVE`,
      );
    }

    const amount = Math.round((lesson.price ?? 0) * 100);
    const pi = await this.stripe.paymentIntents.create(
      {
        amount,
        currency: 'brl',
        customer: student.stripeCustomerId,
        payment_method: pm.stripePaymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          lessonId: lesson.id,
          studentId,
          instructorId: instructor.id,
        },
        description: `Aula ${lesson.id}`,
      },
      { idempotencyKey: idempotencyKey(dto.lessonId, 'charge') },
    );

    const chargeId =
      typeof pi.latest_charge === 'string'
        ? pi.latest_charge
        : ((pi.latest_charge as { id?: string } | null)?.id ?? null);

    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        lessonId: lesson.id,
        paymentMethodId: pm.id,
        amount: lesson.price ?? 0,
        stripePaymentIntentId: pi.id,
        stripeChargeId: chargeId,
        status: pi.status === 'succeeded' ? 'HELD' : 'PENDING',
      },
    });
    return payment;
  }

  private isValidForCompliance(lesson: any): boolean {
    return (
      lesson.status === 'completed' &&
      (lesson.durationMinutes ?? 0) >= 50 &&
      lesson.biometryStartStatus === 'SUCCESS' &&
      lesson.biometryMidStatus === 'SUCCESS' &&
      lesson.biometryEndStatus === 'SUCCESS' &&
      lesson.integrityHash !== null &&
      lesson.disputeOpened === false
    );
  }

  async releaseEscrow(lessonId: string): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { lessonId },
    });
    if (!payment)
      throw new NotFoundException(`No payment for lesson ${lessonId}`);
    if (payment.status === 'RELEASED') {
      this.logger.log(`Payment ${payment.id} already RELEASED — skipping`);
      return;
    }
    if (payment.status !== 'HELD') {
      throw new BadRequestException(
        `Payment is in status ${payment.status} — only HELD can be released`,
      );
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!this.isValidForCompliance(lesson)) {
      throw new BadRequestException(
        'Lesson does not meet compliance — cannot release escrow',
      );
    }

    const instructor = await this.prisma.instructor.findUnique({
      where: { id: lesson.instructorId },
    });
    if (!instructor?.stripeAccountId) {
      throw new BadRequestException('Instructor has no Stripe account');
    }

    const { platformFeeAmount, instructorAmount, instructorAmountCents } =
      this.computeSplit(payment.amount ?? 0);

    const transfer = await this.stripe.transfers.create(
      {
        amount: instructorAmountCents,
        currency: 'brl',
        destination: instructor.stripeAccountId,
        transfer_group: lesson.id,
        source_transaction: payment.stripeChargeId ?? undefined,
        metadata: { lessonId: lesson.id, paymentId: payment.id },
      },
      { idempotencyKey: idempotencyKey(payment.id, 'release') },
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'RELEASED',
        stripeTransferId: transfer.id,
        platformFeeAmount,
        instructorAmount,
      },
    });
  }

  async resolveDispute(
    lessonId: string,
    dto: { action: 'release' | 'refund'; reason?: string },
  ): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { lessonId },
    });
    if (!payment)
      throw new NotFoundException(`No payment for lesson ${lessonId}`);

    if (dto.action === 'release') {
      if (payment.status === 'RELEASED') return;
      if (payment.status !== 'HELD') {
        throw new BadRequestException(
          `Payment in status ${payment.status} cannot be released`,
        );
      }
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { instructor: { select: { stripeAccountId: true } } },
      });
      const instructor = lesson?.instructor;
      if (!instructor?.stripeAccountId) {
        throw new BadRequestException('Instructor has no Stripe account');
      }
      const { platformFeeAmount, instructorAmount, instructorAmountCents } =
        this.computeSplit(payment.amount ?? 0);

      const transfer = await this.stripe.transfers.create(
        {
          amount: instructorAmountCents,
          currency: 'brl',
          destination: instructor.stripeAccountId,
          transfer_group: lessonId,
          source_transaction: payment.stripeChargeId ?? undefined,
          metadata: {
            lessonId,
            paymentId: payment.id,
            resolution: 'release',
            reason: dto.reason ?? '',
          },
        },
        { idempotencyKey: idempotencyKey(payment.id, 'release') },
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'RELEASED',
          stripeTransferId: transfer.id,
          platformFeeAmount,
          instructorAmount,
        },
      });
      return;
    }

    // refund
    if (payment.status === 'REFUNDED') return;
    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Payment has no PaymentIntent to refund');
    }
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        reason: 'requested_by_customer',
        metadata: { lessonId, resolution: 'refund', reason: dto.reason ?? '' },
      },
      { idempotencyKey: idempotencyKey(payment.id, 'refund') },
    );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', stripeRefundId: refund.id },
    });
  }

  async listReleaseFailed() {
    return this.prisma.payment.findMany({
      where: { status: 'RELEASE_FAILED' },
      orderBy: { lastReleaseAttemptAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        releaseAttempts: true,
        lastReleaseAttemptAt: true,
        createdAt: true,
        lessonId: true,
        studentId: true,
        lesson: {
          select: {
            date: true,
            status: true,
            durationMinutes: true,
            biometryStartStatus: true,
            biometryMidStatus: true,
            biometryEndStatus: true,
            instructor: { select: { id: true, name: true, email: true } },
          },
        },
        student: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async resolveReleaseFailed(
    paymentId: string,
    dto: { action: 'retry' | 'refund'; reason?: string },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (payment.status !== 'RELEASE_FAILED') {
      throw new BadRequestException(
        `Payment status is ${payment.status} — expected RELEASE_FAILED`,
      );
    }

    if (dto.action === 'retry') {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'HELD',
          releaseAttempts: 0,
          lastReleaseAttemptAt: null,
        },
      });
      return {
        message: 'Payment reset to HELD — will be retried on next cron cycle',
      };
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Payment has no PaymentIntent to refund');
    }
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        reason: 'requested_by_customer',
        metadata: { paymentId, resolution: 'refund', reason: dto.reason ?? '' },
      },
      { idempotencyKey: idempotencyKey(paymentId, 'refund') },
    );
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED', stripeRefundId: refund.id },
    });
    return { message: 'Payment refunded successfully', refundId: refund.id };
  }

  async listMyPayments(studentId: string) {
    return this.prisma.payment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        lessonId: true,
        stripePaymentIntentId: true,
        stripeTransferId: true,
        stripeRefundId: true,
        createdAt: true,
      },
    });
  }

  async handlePaymentIntentSucceeded(pi: { id: string }) {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: pi.id, status: { in: ['PENDING'] } },
      data: { status: 'HELD' },
    });
  }

  async handlePaymentIntentFailed(pi: {
    id: string;
    last_payment_error?: { message?: string } | null;
  }) {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: {
        status: 'FAILED',
        failureReason: pi.last_payment_error?.message ?? 'unknown',
      },
    });
  }

  async handleTransferCreated(transfer: { id: string }) {
    this.logger.log(
      `Webhook transfer.created received for ${transfer.id} — RELEASED already persisted`,
    );
  }

  async handleTransferFailed(transfer: { id: string }) {
    await this.prisma.payment.updateMany({
      where: { stripeTransferId: transfer.id },
      data: { status: 'HELD' },
    });
    this.logger.error(
      `Transfer ${transfer.id} failed — Payment reverted to HELD`,
    );
  }
}

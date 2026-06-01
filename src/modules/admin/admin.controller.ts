import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from '../payments-stripe/stripe.client';
import { idempotencyKey } from '../payments-stripe/lib/idempotency';
import { PaymentsStripeService } from '../payments-stripe/payments-stripe.service';
import { ResolveDisputeDto } from '../payments-stripe/dto/resolve-dispute.dto';
import { ResolveReleaseFailedDto } from '../payments-stripe/dto/resolve-release-failed.dto';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';

const SEED_PM = 'pm_card_visa';

@ApiExcludeController()
@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: InstanceType<typeof Stripe>,
    private readonly paymentsService: PaymentsStripeService,
  ) {}

  @Post('instructors/:id/approve')
  @HttpCode(200)
  async approveInstructor(@Param('id') id: string) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id },
      select: { id: true, credentialValidUntil: true },
    });
    if (!instructor) throw new NotFoundException(`Instructor ${id} not found`);

    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

    const validUntil =
      instructor.credentialValidUntil &&
      instructor.credentialValidUntil > new Date()
        ? instructor.credentialValidUntil
        : twoYearsFromNow;

    const updated = await this.prisma.instructor.update({
      where: { id },
      data: {
        credentialStatus: 'APPROVED',
        credentialValidUntil: validUntil,
        stripeAccountStatus: 'ACTIVE',
        stripePayoutsEnabled: true,
      },
      select: {
        id: true,
        email: true,
        credentialStatus: true,
        credentialValidUntil: true,
        stripeAccountStatus: true,
      },
    });

    return { message: 'Instructor approved', instructor: updated };
  }

  @Post('students/:id/seed-payment-method')
  @HttpCode(201)
  async seedPaymentMethod(@Param('id') id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!student) throw new NotFoundException(`Student ${id} not found`);

    let customerId = student.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        {
          email: student.email,
          name: student.name,
          metadata: { studentId: id },
        },
        { idempotencyKey: idempotencyKey(id, 'connect-account') },
      );
      customerId = customer.id;
      await this.prisma.student.update({
        where: { id },
        data: { stripeCustomerId: customerId },
      });
    }

    const pm = await this.stripe.paymentMethods.attach(
      SEED_PM,
      { customer: customerId },
      { idempotencyKey: idempotencyKey(id, 'seed-payment-method') },
    );

    const existing = await this.prisma.paymentMethod.findMany({
      where: { studentId: id, isDeleted: false },
    });
    const isDefault = existing.length === 0;

    const row = await this.prisma.paymentMethod.create({
      data: {
        studentId: id,
        stripePaymentMethodId: pm.id,
        brand: pm.card!.brand,
        last4: pm.card!.last4,
        cardholderName: pm.billing_details?.name ?? student.name,
        expiryMonth: String(pm.card!.exp_month).padStart(2, '0'),
        expiryYear: String(pm.card!.exp_year),
        isDefault,
      },
    });

    return { message: 'Seed payment method attached', paymentMethod: row };
  }

  @Post('lessons/:lessonId/resolve-dispute')
  @HttpCode(200)
  resolveDispute(
    @Param('lessonId') lessonId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.paymentsService.resolveDispute(lessonId, dto);
  }

  @Get('payments/release-failed')
  listReleaseFailed() {
    return this.paymentsService.listReleaseFailed();
  }

  @Post('payments/:paymentId/resolve')
  @HttpCode(200)
  resolveReleaseFailed(
    @Param('paymentId') paymentId: string,
    @Body() dto: ResolveReleaseFailedDto,
  ) {
    return this.paymentsService.resolveReleaseFailed(paymentId, dto);
  }
}

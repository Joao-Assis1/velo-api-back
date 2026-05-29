import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsStripeService } from './payments-stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.client';

describe('PaymentsStripeService', () => {
  let service: PaymentsStripeService;
  let prisma: any;
  let stripe: any;

  beforeEach(async () => {
    prisma = {
      student: { findUnique: jest.fn(), update: jest.fn() },
      paymentMethod: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      lesson: { findUnique: jest.fn() },
      instructor: { findUnique: jest.fn() },
    };
    stripe = {
      customers: { create: jest.fn(), retrieve: jest.fn() },
      setupIntents: { create: jest.fn() },
      paymentMethods: {
        attach: jest.fn(),
        detach: jest.fn(),
        retrieve: jest.fn(),
      },
      paymentIntents: { create: jest.fn() },
      transfers: { create: jest.fn() },
      refunds: { create: jest.fn() },
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsStripeService,
        { provide: PrismaService, useValue: prisma },
        { provide: STRIPE_CLIENT, useValue: stripe },
      ],
    }).compile();
    service = mod.get(PaymentsStripeService);
  });

  describe('createSetupIntent', () => {
    it('creates a Stripe customer on first use and stores stripeCustomerId', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        email: 'a@b.com',
        name: 'Aluno X',
        stripeCustomerId: null,
      });
      stripe.customers.create.mockResolvedValue({ id: 'cus_AAA' });
      stripe.setupIntents.create.mockResolvedValue({
        client_secret: 'seti_secret_XYZ',
      });
      prisma.student.update.mockResolvedValue({});

      const r = await service.createSetupIntent('stu-1');

      expect(stripe.customers.create).toHaveBeenCalledWith(
        { email: 'a@b.com', name: 'Aluno X', metadata: { studentId: 'stu-1' } },
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: { stripeCustomerId: 'cus_AAA' },
      });
      expect(stripe.setupIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_AAA',
          payment_method_types: ['card'],
        }),
        { idempotencyKey: expect.any(String) },
      );
      expect(r).toEqual({ clientSecret: 'seti_secret_XYZ', customerId: 'cus_AAA' });
    });

    it('reuses existing customer when stripeCustomerId is set', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        email: 'a@b.com',
        name: 'Aluno X',
        stripeCustomerId: 'cus_EXISTING',
      });
      stripe.setupIntents.create.mockResolvedValue({
        client_secret: 'seti_secret_2',
      });
      const r = await service.createSetupIntent('stu-1');
      expect(stripe.customers.create).not.toHaveBeenCalled();
      expect(r.customerId).toBe('cus_EXISTING');
    });
  });

  describe('attachPaymentMethod', () => {
    it('attaches PM to customer, fetches card metadata, persists local row', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        stripeCustomerId: 'cus_EXISTING',
      });
      stripe.paymentMethods.attach.mockResolvedValue({});
      stripe.paymentMethods.retrieve.mockResolvedValue({
        id: 'pm_1Q',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2030,
        },
        billing_details: { name: 'JOAO SILVA' },
      });
      prisma.paymentMethod.findMany.mockResolvedValue([]);
      prisma.paymentMethod.create.mockResolvedValue({
        id: 'pm-row-1',
        stripePaymentMethodId: 'pm_1Q',
        brand: 'visa',
        last4: '4242',
        cardholderName: 'JOAO SILVA',
        expiryMonth: '12',
        expiryYear: '2030',
        isDefault: true,
      });

      const r = await service.attachPaymentMethod('stu-1', { stripePaymentMethodId: 'pm_1Q' });
      expect(stripe.paymentMethods.attach).toHaveBeenCalledWith(
        'pm_1Q',
        { customer: 'cus_EXISTING' },
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.paymentMethod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripePaymentMethodId: 'pm_1Q',
            brand: 'visa',
            last4: '4242',
            isDefault: true,
          }),
        }),
      );
      expect(r.brand).toBe('visa');
    });

    it('throws when student has no Stripe customer yet', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        stripeCustomerId: null,
      });
      await expect(
        service.attachPaymentMethod('stu-1', { stripePaymentMethodId: 'pm_1Q' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('detachPaymentMethod', () => {
    it('detaches at Stripe, marks isDeleted=true (soft delete)', async () => {
      prisma.paymentMethod.findFirst.mockResolvedValue({
        id: 'pm-row-1',
        studentId: 'stu-1',
        stripePaymentMethodId: 'pm_1Q',
        isDeleted: false,
      });
      stripe.paymentMethods.detach.mockResolvedValue({});
      await service.detachPaymentMethod('stu-1', 'pm-row-1');
      expect(stripe.paymentMethods.detach).toHaveBeenCalledWith(
        'pm_1Q',
        {},
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.paymentMethod.update).toHaveBeenCalledWith({
        where: { id: 'pm-row-1' },
        data: { isDeleted: true, isDefault: false },
      });
    });

    it('throws NotFoundException when payment method does not belong to student', async () => {
      prisma.paymentMethod.findFirst.mockResolvedValue(null);
      await expect(
        service.detachPaymentMethod('stu-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('charge', () => {
    it('creates PaymentIntent with destination charge and persists Payment.status=PENDING', async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        id: 'lsn-1',
        studentId: 'stu-1',
        instructorId: 'inst-1',
        price: 120,
      });
      prisma.paymentMethod.findFirst.mockResolvedValue({
        id: 'pm-row-1',
        studentId: 'stu-1',
        stripePaymentMethodId: 'pm_1Q',
        isDeleted: false,
      });
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        stripeCustomerId: 'cus_EXISTING',
      });
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_INST',
        stripeAccountStatus: 'ACTIVE',
        stripePayoutsEnabled: true,
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_ABCD',
        status: 'requires_capture',
        latest_charge: 'ch_ABCD',
      });
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        stripePaymentIntentId: 'pi_ABCD',
        stripeChargeId: 'ch_ABCD',
        status: 'PENDING',
        lessonId: 'lsn-1',
        amount: 120,
      });

      const r = await service.charge('stu-1', {
        lessonId: 'lsn-1',
        paymentMethodId: 'pm-row-1',
      });
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 12000,
          currency: 'brl',
          customer: 'cus_EXISTING',
          payment_method: 'pm_1Q',
          confirm: true,
          off_session: true,
          metadata: expect.objectContaining({
            lessonId: 'lsn-1',
            studentId: 'stu-1',
          }),
        }),
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripePaymentIntentId: 'pi_ABCD',
            stripeChargeId: 'ch_ABCD',
            status: 'PENDING',
            amount: 120,
            lessonId: 'lsn-1',
          }),
        }),
      );
      expect(r.status).toBe('PENDING');
    });

    it('rejects when instructor stripeAccountStatus != ACTIVE', async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        id: 'lsn-1',
        studentId: 'stu-1',
        instructorId: 'inst-1',
        price: 120,
      });
      prisma.paymentMethod.findFirst.mockResolvedValue({
        id: 'pm-row-1',
        studentId: 'stu-1',
        stripePaymentMethodId: 'pm_1Q',
        isDeleted: false,
      });
      prisma.student.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_EXISTING',
      });
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountStatus: 'PENDING',
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(
        service.charge('stu-1', { lessonId: 'lsn-1', paymentMethodId: 'pm-row-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing payment when a charge for the same lesson already exists (idempotent)', async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        id: 'lsn-1',
        studentId: 'stu-1',
        instructorId: 'inst-1',
        price: 120,
      });
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-existing',
        lessonId: 'lsn-1',
        status: 'HELD',
        stripePaymentIntentId: 'pi_EXISTING',
      });
      const r = await service.charge('stu-1', {
        lessonId: 'lsn-1',
        paymentMethodId: 'pm-row-1',
      });
      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
      expect(r.id).toBe('pay-existing');
    });
  });

  describe('releaseEscrow', () => {
    it('creates transfer to instructor Stripe account and marks Payment.status=RELEASED', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        lessonId: 'lsn-1',
        amount: 120,
        status: 'HELD',
        stripePaymentIntentId: 'pi_ABCD',
        stripeChargeId: 'ch_ABCD',
      });
      prisma.lesson.findUnique.mockResolvedValue({
        id: 'lsn-1',
        instructorId: 'inst-1',
        status: 'completed',
        durationMinutes: 60,
        biometryStartStatus: 'SUCCESS',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: 'h',
        disputeOpened: false,
      });
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_INST',
      });
      stripe.transfers.create.mockResolvedValue({ id: 'tr_XYZ' });
      prisma.payment.update.mockResolvedValue({});
      await service.releaseEscrow('lsn-1');
      expect(stripe.transfers.create).toHaveBeenCalledWith(
        {
          amount: 9600,          // 80% de R$120 = R$96,00 → 9600 centavos
          currency: 'brl',
          destination: 'acct_INST',
          transfer_group: 'lsn-1',
          source_transaction: 'ch_ABCD',
          metadata: { lessonId: 'lsn-1', paymentId: 'pay-1' },
        },
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: {
          status: 'RELEASED',
          stripeTransferId: 'tr_XYZ',
          platformFeeAmount: 24,   // 20% de R$120
          instructorAmount: 96,    // 80% de R$120
        },
      });
    });

    it('does NOT release when lesson fails isValidForCompliance', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        lessonId: 'lsn-1',
        status: 'HELD',
        stripePaymentIntentId: 'pi_ABCD',
      });
      prisma.lesson.findUnique.mockResolvedValue({
        id: 'lsn-1',
        status: 'completed',
        durationMinutes: 30,
        biometryStartStatus: 'SUCCESS',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: 'h',
        disputeOpened: false,
      });
      await expect(service.releaseEscrow('lsn-1')).rejects.toThrow(
        /does not meet compliance/i,
      );
      expect(stripe.transfers.create).not.toHaveBeenCalled();
    });

    it('is idempotent — already-RELEASED payment short-circuits', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        lessonId: 'lsn-1',
        status: 'RELEASED',
        stripeTransferId: 'tr_OLD',
      });
      await service.releaseEscrow('lsn-1');
      expect(stripe.transfers.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveDispute', () => {
    it('action=release calls releaseEscrow flow', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        lessonId: 'lsn-1',
        amount: 120,
        status: 'HELD',
        stripePaymentIntentId: 'pi_ABCD',
        stripeChargeId: 'ch_ABCD',
      });
      prisma.lesson.findUnique.mockResolvedValue({
        id: 'lsn-1',
        instructorId: 'inst-1',
        status: 'completed',
        durationMinutes: 60,
        biometryStartStatus: 'SUCCESS',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: 'h',
        disputeOpened: true,
        instructor: { stripeAccountId: 'acct_INST' },
      });
      stripe.transfers.create.mockResolvedValue({ id: 'tr_RES' });
      prisma.payment.update.mockResolvedValue({});
      await service.resolveDispute('lsn-1', { action: 'release', reason: 'admin override' });
      expect(stripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9600,  // 80% de R$120
          destination: 'acct_INST',
          source_transaction: 'ch_ABCD',
        }),
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: expect.objectContaining({
          status: 'RELEASED',
          platformFeeAmount: 24,
          instructorAmount: 96,
        }),
      });
    });

    it('action=refund creates refund and marks Payment.status=REFUNDED', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        lessonId: 'lsn-1',
        status: 'HELD',
        stripePaymentIntentId: 'pi_ABCD',
      });
      stripe.refunds.create.mockResolvedValue({ id: 're_XYZ' });
      prisma.payment.update.mockResolvedValue({});
      await service.resolveDispute('lsn-1', { action: 'refund', reason: 'fraud' });
      expect(stripe.refunds.create).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_ABCD',
          reason: 'requested_by_customer',
          metadata: { lessonId: 'lsn-1', resolution: 'refund', reason: 'fraud' },
        },
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'REFUNDED', stripeRefundId: 're_XYZ' },
      });
    });
  });

  describe('releaseEscrow — split edge cases', () => {
    const basePayment = {
      id: 'pay-1',
      lessonId: 'lsn-1',
      amount: 100,
      status: 'HELD',
      stripePaymentIntentId: 'pi_ABCD',
      stripeChargeId: 'ch_ABCD',
    };
    const baseLesson = {
      id: 'lsn-1',
      instructorId: 'inst-1',
      status: 'completed',
      durationMinutes: 60,
      biometryStartStatus: 'SUCCESS',
      biometryMidStatus: 'SUCCESS',
      biometryEndStatus: 'SUCCESS',
      integrityHash: 'h',
      disputeOpened: false,
    };

    beforeEach(() => {
      prisma.payment.findFirst.mockResolvedValue(basePayment);
      prisma.lesson.findUnique.mockResolvedValue(baseLesson);
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_INST',
      });
      stripe.transfers.create.mockResolvedValue({ id: 'tr_XYZ' });
      prisma.payment.update.mockResolvedValue({});
    });

    afterEach(() => {
      delete process.env.PLATFORM_FEE_PERCENT;
    });

    it('PLATFORM_FEE_PERCENT=0 → transfer = 100% do valor', async () => {
      process.env.PLATFORM_FEE_PERCENT = '0';
      await service.releaseEscrow('lsn-1');
      expect(stripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10000 }),
        expect.any(Object),
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: expect.objectContaining({ platformFeeAmount: 0, instructorAmount: 100 }),
      });
    });

    it('PLATFORM_FEE_PERCENT=100 → transfer = R$0,00', async () => {
      process.env.PLATFORM_FEE_PERCENT = '100';
      await service.releaseEscrow('lsn-1');
      expect(stripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0 }),
        expect.any(Object),
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: expect.objectContaining({ platformFeeAmount: 100, instructorAmount: 0 }),
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ASAAS_CLIENT } from './asaas.client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUDENT_ID = 'stu-1';
const LESSON_ID = 'lesson-1';
const INSTRUCTOR_ID = 'inst-1';
const PAYMENT_METHOD_ID = 'pm-1';
const ASAAS_CUSTOMER_ID = 'cus_asaas_1';
const ASAAS_PAYMENT_ID = 'pay_asaas_1';
const CREDIT_CARD_TOKEN = 'tok_card_1';

const baseLesson = {
  id: LESSON_ID,
  studentId: STUDENT_ID,
  instructorId: INSTRUCTOR_ID,
  price: 150,
};

const basePaymentMethod = {
  id: PAYMENT_METHOD_ID,
  studentId: STUDENT_ID,
  isDefault: true,
  isDeleted: false,
  asaasCreditCardToken: CREDIT_CARD_TOKEN,
};

const baseStudent = {
  id: STUDENT_ID,
  asaasCustomerId: ASAAS_CUSTOMER_ID,
};

const baseInstructor = {
  id: INSTRUCTOR_ID,
  pixKey: 'instrutor@pix.com',
  pixKeyType: 'EMAIL',
};

const basePayment = {
  id: 'pay-uuid-1',
  lessonId: LESSON_ID,
  studentId: STUDENT_ID,
  amount: 150,
  status: 'PENDING',
  asaasPaymentId: ASAAS_PAYMENT_ID,
};

const heldPayment = {
  ...basePayment,
  status: 'HELD',
};

const complianceLesson = {
  id: LESSON_ID,
  studentId: STUDENT_ID,
  instructorId: INSTRUCTOR_ID,
  price: 150,
  status: 'completed',
  durationMinutes: 50,
  biometryStartStatus: 'SUCCESS',
  biometryMidStatus: 'SUCCESS',
  biometryEndStatus: 'SUCCESS',
  integrityHash: 'abc123',
  disputeOpened: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let asaas: any;

  beforeEach(async () => {
    prisma = {
      lesson: { findUnique: jest.fn() },
      payment: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      paymentMethod: { findFirst: jest.fn() },
      student: { findUnique: jest.fn() },
      instructor: { findUnique: jest.fn() },
    };

    asaas = {
      charge: jest.fn(),
      transferPix: jest.fn(),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ASAAS_CLIENT, useValue: asaas },
      ],
    }).compile();

    service = mod.get(PaymentsService);
  });

  describe('charge', () => {
    // Setup happy-path mocks for all steps
    const setupHappyPath = () => {
      prisma.lesson.findUnique.mockResolvedValue(baseLesson);
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.paymentMethod.findFirst.mockResolvedValue(basePaymentMethod);
      prisma.student.findUnique.mockResolvedValue(baseStudent);
      prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
      asaas.charge.mockResolvedValue({ id: ASAAS_PAYMENT_ID, status: 'PENDING' });
      prisma.payment.create.mockResolvedValue(basePayment);
    };

    it('creates Payment with PENDING status on success', async () => {
      setupHappyPath();

      const result = await service.charge(STUDENT_ID, { lessonId: LESSON_ID });

      expect(asaas.charge).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: ASAAS_CUSTOMER_ID,
          billingType: 'CREDIT_CARD',
          value: 150,
          creditCardToken: CREDIT_CARD_TOKEN,
        }),
        expect.any(String), // idempotency key
      );

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: STUDENT_ID,
          lessonId: LESSON_ID,
          paymentMethodId: PAYMENT_METHOD_ID,
          amount: 150,
          status: 'PENDING',
          asaasPaymentId: ASAAS_PAYMENT_ID,
        }),
      });

      expect(result).toEqual(basePayment);
    });

    it('returns existing Payment idempotently if lessonId already has one', async () => {
      prisma.lesson.findUnique.mockResolvedValue(baseLesson);
      prisma.payment.findFirst.mockResolvedValue(basePayment);

      const result = await service.charge(STUDENT_ID, { lessonId: LESSON_ID });

      expect(prisma.paymentMethod.findFirst).not.toHaveBeenCalled();
      expect(asaas.charge).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(result).toEqual(basePayment);
    });

    it('throws NotFoundException when lesson is not found', async () => {
      prisma.lesson.findUnique.mockResolvedValue(null);

      await expect(
        service.charge(STUDENT_ID, { lessonId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when lesson does not belong to student', async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        ...baseLesson,
        studentId: 'other-student',
      });

      await expect(
        service.charge(STUDENT_ID, { lessonId: LESSON_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when student has no default payment method', async () => {
      prisma.lesson.findUnique.mockResolvedValue(baseLesson);
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.paymentMethod.findFirst.mockResolvedValue(null);

      await expect(
        service.charge(STUDENT_ID, { lessonId: LESSON_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when instructor has no pixKey', async () => {
      prisma.lesson.findUnique.mockResolvedValue(baseLesson);
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.paymentMethod.findFirst.mockResolvedValue(basePaymentMethod);
      prisma.student.findUnique.mockResolvedValue(baseStudent);
      prisma.instructor.findUnique.mockResolvedValue({
        ...baseInstructor,
        pixKey: null,
      });

      await expect(
        service.charge(STUDENT_ID, { lessonId: LESSON_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when student has no asaasCustomerId', async () => {
      prisma.lesson.findUnique.mockResolvedValue(baseLesson);
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.paymentMethod.findFirst.mockResolvedValue(basePaymentMethod);
      prisma.student.findUnique.mockResolvedValue({
        ...baseStudent,
        asaasCustomerId: null,
      });
      prisma.instructor.findUnique.mockResolvedValue(baseInstructor);

      await expect(
        service.charge(STUDENT_ID, { lessonId: LESSON_ID }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // handlePaymentWebhook
  // ---------------------------------------------------------------------------

  describe('handlePaymentWebhook', () => {
    const asaasPaymentId = 'pay_asaas_001';

    beforeEach(() => {
      prisma.payment.findUnique = jest.fn();
      prisma.payment.update = jest.fn();
    });

    it('sets status to HELD on PAYMENT_CONFIRMED', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'local-uuid-1',
        asaasPaymentId,
        status: 'PENDING',
      });

      await service.handlePaymentWebhook('PAYMENT_CONFIRMED', asaasPaymentId);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'local-uuid-1' },
        data: { status: 'HELD' },
      });
    });

    it('sets status to HELD on PAYMENT_RECEIVED', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'local-uuid-2',
        asaasPaymentId,
        status: 'PENDING',
      });

      await service.handlePaymentWebhook('PAYMENT_RECEIVED', asaasPaymentId);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'local-uuid-2' },
        data: { status: 'HELD' },
      });
    });

    it('sets status to FAILED on PAYMENT_OVERDUE', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'local-uuid-3',
        asaasPaymentId,
        status: 'PENDING',
      });

      await service.handlePaymentWebhook('PAYMENT_OVERDUE', asaasPaymentId);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'local-uuid-3' },
        data: { status: 'FAILED' },
      });
    });

    it('sets status to FAILED on PAYMENT_DELETED', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'local-uuid-4',
        asaasPaymentId,
        status: 'PENDING',
      });

      await service.handlePaymentWebhook('PAYMENT_DELETED', asaasPaymentId);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'local-uuid-4' },
        data: { status: 'FAILED' },
      });
    });

    it('is idempotent: does not update when already HELD', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'local-uuid-5',
        asaasPaymentId,
        status: 'HELD',
      });

      await service.handlePaymentWebhook('PAYMENT_CONFIRMED', asaasPaymentId);

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('is idempotent: does not update when already FAILED', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'local-uuid-6',
        asaasPaymentId,
        status: 'FAILED',
      });

      await service.handlePaymentWebhook('PAYMENT_OVERDUE', asaasPaymentId);

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('ignores unknown events (no-op, no DB calls)', async () => {
      await service.handlePaymentWebhook('REFUND_CREATED', asaasPaymentId);

      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('ignores gracefully when payment is not found', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handlePaymentWebhook('PAYMENT_CONFIRMED', 'pay_unknown'),
      ).resolves.toBeUndefined();

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // resolveDispute
  // ---------------------------------------------------------------------------

  describe('resolveDispute', () => {
    const refundedPaymentId = 'refund_asaas_1';

    beforeEach(() => {
      // Add refund mock to asaas
      asaas.refund = jest.fn();
    });

    describe('action: refund', () => {
      it('calls asaas.refund, sets REFUNDED, stores asaasRefundId', async () => {
        prisma.payment.findFirst.mockResolvedValue(heldPayment);
        asaas.refund.mockResolvedValue({ id: refundedPaymentId, status: 'REFUNDED' });
        prisma.payment.update.mockResolvedValue({ ...heldPayment, status: 'REFUNDED' });

        await service.resolveDispute(LESSON_ID, { action: 'refund' });

        expect(asaas.refund).toHaveBeenCalledWith(
          ASAAS_PAYMENT_ID,
          `refund-${heldPayment.id}`,
        );
        expect(prisma.payment.update).toHaveBeenCalledWith({
          where: { id: heldPayment.id },
          data: { status: 'REFUNDED', asaasRefundId: refundedPaymentId },
        });
      });

      it('is idempotent: already REFUNDED → no-op', async () => {
        prisma.payment.findFirst.mockResolvedValue({ ...heldPayment, status: 'REFUNDED' });

        await service.resolveDispute(LESSON_ID, { action: 'refund' });

        expect(asaas.refund).not.toHaveBeenCalled();
        expect(prisma.payment.update).not.toHaveBeenCalled();
      });

      it('throws BadRequestException when payment has no asaasPaymentId', async () => {
        prisma.payment.findFirst.mockResolvedValue({ ...heldPayment, asaasPaymentId: null });

        await expect(
          service.resolveDispute(LESSON_ID, { action: 'refund' }),
        ).rejects.toThrow(BadRequestException);

        expect(asaas.refund).not.toHaveBeenCalled();
      });
    });

    describe('action: release', () => {
      it('delegates to releaseEscrow', async () => {
        prisma.payment.findFirst.mockResolvedValue(heldPayment);
        const releaseSpy = jest.spyOn(service, 'releaseEscrow').mockResolvedValue(undefined);

        await service.resolveDispute(LESSON_ID, { action: 'release' });

        expect(releaseSpy).toHaveBeenCalledWith(LESSON_ID);
      });
    });

    describe('payment not found', () => {
      it('throws NotFoundException when no payment exists for the lesson', async () => {
        prisma.payment.findFirst.mockResolvedValue(null);

        await expect(
          service.resolveDispute(LESSON_ID, { action: 'refund' }),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // releaseEscrow
  // ---------------------------------------------------------------------------

  describe('releaseEscrow', () => {
    const TRANSFER_ID = 'transfer_asaas_1';

    const setupHappyPath = () => {
      prisma.payment.findFirst.mockResolvedValue(heldPayment);
      prisma.lesson.findUnique.mockResolvedValue(complianceLesson);
      prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
      asaas.transferPix.mockResolvedValue({ id: TRANSFER_ID, status: 'PENDING' });
      prisma.payment.update.mockResolvedValue({ ...heldPayment, status: 'RELEASED' });
    };

    it('happy path: calls transferPix and updates payment to RELEASED', async () => {
      setupHappyPath();

      await service.releaseEscrow(LESSON_ID);

      expect(asaas.transferPix).toHaveBeenCalledWith(
        {
          value: expect.any(Number),
          pixAddressKey: baseInstructor.pixKey,
          pixAddressKeyType: baseInstructor.pixKeyType,
          description: expect.any(String),
        },
        `transfer-${heldPayment.id}`,
      );

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: heldPayment.id },
        data: expect.objectContaining({
          status: 'RELEASED',
          asaasTransferId: TRANSFER_ID,
          platformFeeAmount: expect.any(Number),
          instructorAmount: expect.any(Number),
        }),
      });
    });

    it('idempotent: already RELEASED → no-op, no transferPix call', async () => {
      prisma.payment.findFirst.mockResolvedValue({ ...heldPayment, status: 'RELEASED' });

      await service.releaseEscrow(LESSON_ID);

      expect(asaas.transferPix).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when payment does not exist for lesson', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.releaseEscrow(LESSON_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when payment is not HELD (PENDING)', async () => {
      prisma.payment.findFirst.mockResolvedValue({ ...heldPayment, status: 'PENDING' });

      await expect(service.releaseEscrow(LESSON_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when lesson does not pass compliance', async () => {
      prisma.payment.findFirst.mockResolvedValue(heldPayment);
      prisma.lesson.findUnique.mockResolvedValue({
        ...complianceLesson,
        durationMinutes: 30, // too short
      });
      prisma.instructor.findUnique.mockResolvedValue(baseInstructor);

      await expect(service.releaseEscrow(LESSON_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when instructor has no pixKey', async () => {
      prisma.payment.findFirst.mockResolvedValue(heldPayment);
      prisma.lesson.findUnique.mockResolvedValue(complianceLesson);
      prisma.instructor.findUnique.mockResolvedValue({
        ...baseInstructor,
        pixKey: null,
        pixKeyType: null,
      });

      await expect(service.releaseEscrow(LESSON_ID)).rejects.toThrow(BadRequestException);
    });

    it('split: platform gets 20%, instructor gets 80% of payment amount', async () => {
      setupHappyPath();

      await service.releaseEscrow(LESSON_ID);

      const updateCall = prisma.payment.update.mock.calls[0][0];
      const { platformFeeAmount, instructorAmount } = updateCall.data;

      expect(platformFeeAmount).toBeCloseTo(150 * 0.2);
      expect(instructorAmount).toBeCloseTo(150 * 0.8);
      expect(platformFeeAmount + instructorAmount).toBeCloseTo(150);
    });
  });
});

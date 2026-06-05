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
      payment: { findFirst: jest.fn(), create: jest.fn() },
      paymentMethod: { findFirst: jest.fn() },
      student: { findUnique: jest.fn() },
      instructor: { findUnique: jest.fn() },
    };

    asaas = {
      charge: jest.fn(),
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
});

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from '../payments-stripe/stripe.client';
import { PaymentsStripeService } from '../payments-stripe/payments-stripe.service';

describe('AdminController', () => {
  let controller: AdminController;
  let prisma: any;
  let stripe: any;

  beforeEach(async () => {
    prisma = {
      instructor: { findUnique: jest.fn(), update: jest.fn() },
      student: { findUnique: jest.fn(), update: jest.fn() },
      paymentMethod: { findMany: jest.fn(), create: jest.fn() },
    };
    stripe = {
      customers: { create: jest.fn() },
      paymentMethods: { attach: jest.fn() },
    };

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: STRIPE_CLIENT, useValue: stripe },
        { provide: PaymentsStripeService, useValue: { resolveDispute: jest.fn() } },
      ],
    })
      .overrideGuard(AdminApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = mod.get(AdminController);
  });

  describe('seedPaymentMethod', () => {
    it('throws NotFoundException when student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(controller.seedPaymentMethod('stu-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates a Stripe customer when student has no stripeCustomerId', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        email: 'a@b.com',
        name: 'Ana',
        stripeCustomerId: null,
      });
      stripe.customers.create.mockResolvedValue({ id: 'cus_new' });
      prisma.student.update.mockResolvedValue({});
      stripe.paymentMethods.attach.mockResolvedValue({
        id: 'pm_attached_1',
        card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
        billing_details: { name: 'Ana' },
      });
      prisma.paymentMethod.findMany.mockResolvedValue([]);
      prisma.paymentMethod.create.mockResolvedValue({
        id: 'row-1',
        stripePaymentMethodId: 'pm_attached_1',
        brand: 'visa',
        last4: '4242',
        isDefault: true,
      });

      const result = await controller.seedPaymentMethod('stu-1');

      expect(stripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.com', name: 'Ana' }),
        expect.any(Object),
      );
      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stu-1' },
          data: { stripeCustomerId: 'cus_new' },
        }),
      );
      expect(result.paymentMethod.isDefault).toBe(true);
    });

    it('skips customer creation when stripeCustomerId already exists', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-2',
        email: 'b@b.com',
        name: 'Bob',
        stripeCustomerId: 'cus_existing',
      });
      stripe.paymentMethods.attach.mockResolvedValue({
        id: 'pm_attached_2',
        card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
        billing_details: { name: 'Bob' },
      });
      prisma.paymentMethod.findMany.mockResolvedValue([{ id: 'pm-already' }]);
      prisma.paymentMethod.create.mockResolvedValue({
        id: 'row-2',
        stripePaymentMethodId: 'pm_attached_2',
        brand: 'visa',
        last4: '4242',
        isDefault: false,
      });

      const result = await controller.seedPaymentMethod('stu-2');

      expect(stripe.customers.create).not.toHaveBeenCalled();
      expect(stripe.paymentMethods.attach).toHaveBeenCalledWith(
        'pm_card_visa',
        { customer: 'cus_existing' },
        expect.any(Object),
      );
      expect(result.paymentMethod.isDefault).toBe(false);
    });
  });
});

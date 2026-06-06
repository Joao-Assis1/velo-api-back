import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

describe('AdminController', () => {
  let controller: AdminController;
  let prisma: any;
  let paymentsService: any;

  beforeEach(async () => {
    prisma = {
      instructor: { findUnique: jest.fn(), update: jest.fn() },
    };
    paymentsService = {
      resolveDispute: jest.fn(),
      listReleaseFailed: jest.fn(),
      resolveReleaseFailed: jest.fn(),
    };

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    })
      .overrideGuard(AdminApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = mod.get(AdminController);
  });

  describe('approveInstructor', () => {
    it('throws NotFoundException when instructor does not exist', async () => {
      prisma.instructor.findUnique.mockResolvedValue(null);

      await expect(controller.approveInstructor('inst-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('approves instructor and returns updated record', async () => {
      const now = new Date();
      const future = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        credentialValidUntil: future,
      });
      prisma.instructor.update.mockResolvedValue({
        id: 'inst-1',
        email: 'inst@test.com',
        credentialStatus: 'APPROVED',
        credentialValidUntil: future,
      });

      const result = await controller.approveInstructor('inst-1');

      expect(prisma.instructor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inst-1' },
          data: expect.objectContaining({ credentialStatus: 'APPROVED' }),
        }),
      );
      expect(result.instructor.credentialStatus).toBe('APPROVED');
    });
  });

  describe('listReleaseFailed', () => {
    it('delegates to paymentsService', async () => {
      paymentsService.listReleaseFailed.mockResolvedValue([]);
      const result = await controller.listReleaseFailed();
      expect(paymentsService.listReleaseFailed).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('resolveReleaseFailed', () => {
    it('delegates to paymentsService', async () => {
      paymentsService.resolveReleaseFailed.mockResolvedValue({ message: 'ok' });
      const result = await controller.resolveReleaseFailed('pay-1', { action: 'retry' });
      expect(paymentsService.resolveReleaseFailed).toHaveBeenCalledWith('pay-1', { action: 'retry' });
      expect(result).toEqual({ message: 'ok' });
    });
  });
});

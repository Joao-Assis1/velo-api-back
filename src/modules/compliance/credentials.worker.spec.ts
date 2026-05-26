import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsWorker } from './credentials.worker';
import { PrismaService } from '../prisma/prisma.service';

describe('CredentialsWorker', () => {
  let worker: CredentialsWorker;
  let prisma: {
    instructor: { findMany: jest.Mock; updateMany: jest.Mock };
    student: { findMany: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      instructor: { findMany: jest.fn(), updateMany: jest.fn() },
      student: { findMany: jest.fn(), updateMany: jest.fn() },
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsWorker,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    worker = mod.get(CredentialsWorker);
  });

  it('blocks instructors with expired CNH (legacy isActive=false)', async () => {
    prisma.instructor.findMany.mockImplementation(({ where }) => {
      if (where.cnhExpiry) {
        return Promise.resolve([
          { id: 'i1', name: 'X', cnhExpiry: '2020-01-01' },
        ]);
      }
      return Promise.resolve([]);
    });
    prisma.student.findMany.mockResolvedValue([]);

    await worker.handleExpiredCredentials();

    expect(prisma.instructor.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['i1'] } },
        data: { isActive: false },
      }),
    );
  });

  it('marks instructors with expired credentialValidUntil as credentialStatus=EXPIRED + stripeAccountStatus=RESTRICTED', async () => {
    prisma.instructor.findMany.mockImplementation(({ where }) => {
      if (where.credentialValidUntil) {
        return Promise.resolve([
          { id: 'i2', name: 'Y', credentialStatus: 'APPROVED' },
        ]);
      }
      return Promise.resolve([]);
    });
    prisma.student.findMany.mockResolvedValue([]);

    await worker.handleExpiredCredentials();

    expect(prisma.instructor.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['i2'] } },
      data: {
        credentialStatus: 'EXPIRED',
        stripeAccountStatus: 'RESTRICTED',
      },
    });
  });

  it('marks students with expired ladvValidUntil as ladvOcrStatus=FAIL', async () => {
    prisma.instructor.findMany.mockResolvedValue([]);
    prisma.student.findMany.mockImplementation(({ where }) => {
      if (where.ladvValidUntil) {
        return Promise.resolve([{ id: 's1' }]);
      }
      return Promise.resolve([]);
    });

    await worker.handleExpiredCredentials();

    expect(prisma.student.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1'] } },
      data: { ladvOcrStatus: 'FAIL', ladvUploaded: false },
    });
  });

  it('runs all three sweeps in a single invocation', async () => {
    prisma.instructor.findMany.mockResolvedValue([]);
    prisma.student.findMany.mockResolvedValue([]);
    await worker.handleExpiredCredentials();
    expect(prisma.instructor.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.student.findMany).toHaveBeenCalledTimes(1);
  });
});

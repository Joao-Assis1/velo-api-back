import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShieldService } from '../telemetria/shield.service';
import { PaymentsService } from '../payments/payments.service';
import { JourneyService } from '../journey/journey.service';
import { ValidationService } from '../validation/validation.service';
import { ConfigService } from '@nestjs/config';
import { DOCUMENT_VALIDATION_PROVIDER } from '../validation/providers/document-validation.provider';

describe('LessonsService.create — validation chain', () => {
  let service: LessonsService;
  let prisma: any;
  let journey: { assertCanScheduleLesson: jest.Mock };
  let validation: { validateCnh: jest.Mock };
  let documentValidation: { validateCnh: jest.Mock };

  const baseInstructor = {
    id: 'inst-1',
    cnhNumber: '02650306461',
    cpf: '11144477735',
    cnhExpiry: new Date(Date.now() + 365 * 86400000).toISOString(),
    credentialStatus: 'APPROVED',
    credentialValidUntil: new Date(Date.now() + 365 * 86400000),
  };

  const validDto = {
    studentId: 'stu-1',
    instructorId: 'inst-1',
    date: '2026-06-01',
    startTime: '10:00',
    endTime: '11:00',
  } as any;

  beforeEach(async () => {
    prisma = {
      instructor: { findUnique: jest.fn() },
      vehicle: { findUnique: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (cb: any) =>
        cb({
          lesson: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'lsn-1' }),
          },
          busySlot: { findMany: jest.fn().mockResolvedValue([]) },
        }),
      ),
    };
    journey = {
      assertCanScheduleLesson: jest.fn().mockResolvedValue(undefined),
    };
    validation = {
      validateCnh: jest
        .fn()
        .mockResolvedValue({ valid: true, status: 'VALID' }),
    };
    documentValidation = { validateCnh: jest.fn() };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ShieldService, useValue: {} },
        {
          provide: PaymentsService,
          useValue: { charge: jest.fn(), resolveDispute: jest.fn() },
        },
        { provide: JourneyService, useValue: journey },
        { provide: ValidationService, useValue: validation },
        {
          provide: ConfigService,
          useValue: { get: () => 'mock' },
        },
        {
          provide: DOCUMENT_VALIDATION_PROVIDER,
          useValue: documentValidation,
        },
      ],
    }).compile();
    service = mod.get(LessonsService);
  });

  it('rejects when journey gate fails', async () => {
    journey.assertCanScheduleLesson.mockRejectedValue(
      new BadRequestException('stage too low'),
    );
    await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
  });

  it('rejects when instructor credentialStatus != APPROVED', async () => {
    prisma.instructor.findUnique.mockResolvedValue({
      ...baseInstructor,
      credentialStatus: 'PENDING',
    });
    await expect(service.create(validDto)).rejects.toThrow(
      /credential is PENDING/,
    );
  });

  it('rejects when instructor credentialValidUntil is past', async () => {
    prisma.instructor.findUnique.mockResolvedValue({
      ...baseInstructor,
      credentialValidUntil: new Date('2020-01-01'),
    });
    await expect(service.create(validDto)).rejects.toThrow(
      /credential is expired/,
    );
  });

  it('rejects when CNH is locally invalid', async () => {
    prisma.instructor.findUnique.mockResolvedValue({
      ...baseInstructor,
      cnhNumber: '11111111111',
    });
    validation.validateCnh.mockResolvedValue({
      valid: false,
      status: 'LOCAL_INVALID',
    });
    await expect(service.create(validDto)).rejects.toThrow(
      /CNH number failed local validation/,
    );
  });

  it('rejects when CNH expiry is past', async () => {
    prisma.instructor.findUnique.mockResolvedValue({
      ...baseInstructor,
      cnhExpiry: '2020-01-01',
    });
    await expect(service.create(validDto)).rejects.toThrow(/CNH is expired/);
  });

  it('rejects when SERPRO provider rejects the CNH (env=serpro)', async () => {
    prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
    // override config to serpro for this test
    (service as any).config = { get: () => 'serpro' };
    documentValidation.validateCnh.mockResolvedValue({
      valid: false,
      status: 'SUSPENDED',
    });
    await expect(service.create(validDto)).rejects.toThrow(
      /rejected by external provider/,
    );
  });

  it('passes when all six checks succeed', async () => {
    prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
    const r = await service.create(validDto);
    expect(r.id).toBe('lsn-1');
    expect(journey.assertCanScheduleLesson).toHaveBeenCalledWith('stu-1');
  });

  it('rejects when vehicle does not belong to the instructor', async () => {
    prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
    prisma.vehicle.findUnique.mockResolvedValue({
      id: 'veh-1',
      instructorId: 'different-inst',
    });
    await expect(
      service.create({ ...validDto, vehicleId: 'veh-1' }),
    ).rejects.toThrow(/Vehicle does not belong/);
  });
});

describe('LessonsService.accept — payment integration', () => {
  let service: LessonsService;
  let prisma: any;
  let paymentsService: { charge: jest.Mock };

  const pendingLesson = {
    id: 'lsn-1',
    studentId: 'stu-1',
    instructorId: 'inst-1',
    status: 'pending_acceptance',
  };

  beforeEach(async () => {
    prisma = {
      lesson: {
        findUnique: jest.fn().mockResolvedValue(pendingLesson),
        update: jest
          .fn()
          .mockResolvedValue({ ...pendingLesson, status: 'upcoming' }),
      },
    };
    paymentsService = { charge: jest.fn().mockResolvedValue({ id: 'pay-1' }) };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ShieldService, useValue: {} },
        { provide: PaymentsService, useValue: paymentsService },
        {
          provide: JourneyService,
          useValue: { assertCanScheduleLesson: jest.fn() },
        },
        { provide: ValidationService, useValue: { validateCnh: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => 'mock' } },
        {
          provide: DOCUMENT_VALIDATION_PROVIDER,
          useValue: { validateCnh: jest.fn() },
        },
      ],
    }).compile();
    service = mod.get(LessonsService);
  });

  it('calls paymentsService.charge (not Stripe) and returns upcoming lesson', async () => {
    const result = await service.accept('lsn-1', 'inst-1');
    expect(paymentsService.charge).toHaveBeenCalledWith('stu-1', {
      lessonId: 'lsn-1',
    });
    expect(result.status).toBe('upcoming');
  });

  it('wraps payment failure as HttpException 402', async () => {
    paymentsService.charge.mockRejectedValue(new Error('Asaas charge failed'));
    await expect(service.accept('lsn-1', 'inst-1')).rejects.toMatchObject({
      status: HttpStatus.PAYMENT_REQUIRED,
      message: 'Asaas charge failed',
    });
  });
});

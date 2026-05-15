import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShieldService } from '../telemetria/shield.service';
import { AsaasService } from '../payments/asaas.service';
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
    cnh: '02650306461',
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
    journey = { assertCanScheduleLesson: jest.fn().mockResolvedValue(undefined) };
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
        { provide: AsaasService, useValue: {} },
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
      cnh: '11111111111',
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

  it('rejects when vehicle is inactive', async () => {
    prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
    prisma.vehicle.findUnique.mockResolvedValue({
      id: 'veh-1',
      instructorId: 'inst-1',
      isActive: false,
    });
    await expect(
      service.create({ ...validDto, vehicleId: 'veh-1' }),
    ).rejects.toThrow(/Vehicle is inactive/);
  });
});

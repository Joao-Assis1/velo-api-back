import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { ScheduleMedicalExamDto } from './dto/schedule-exam.dto';
import { UploadMedicalLaudoDto } from './dto/upload-laudo.dto';
import { MedicalExamDto } from './dto/medical-exam.dto';
import { buildProtocolPdf } from './lib/protocol-pdf';

function newProtocolCode(prefix: string): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `${prefix}-${year}-${suffix}`;
}

@Injectable()
export class MedicalExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  async getMine(studentId: string): Promise<MedicalExamDto | null> {
    return (await this.prisma.medicalExam.findUnique({
      where: { studentId },
    })) as MedicalExamDto | null;
  }

  async schedule(
    studentId: string,
    dto: ScheduleMedicalExamDto,
  ): Promise<MedicalExamDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic || !clinic.isActive || clinic.type !== 'MEDICAL') {
      throw new BadRequestException(
        'Selected clinic is not an active MEDICAL clinic',
      );
    }
    const protocolCode = newProtocolCode('MED');
    const result = await this.prisma.medicalExam.upsert({
      where: { studentId },
      create: {
        studentId,
        clinicId: dto.clinicId,
        scheduledAt: dto.scheduledAt,
        protocolCode,
        status: 'SCHEDULED',
      },
      update: {
        clinicId: dto.clinicId,
        scheduledAt: dto.scheduledAt,
        status: 'SCHEDULED',
      },
    });
    await this.journey.refresh(studentId);
    return result as MedicalExamDto;
  }

  async uploadLaudo(
    studentId: string,
    dto: UploadMedicalLaudoDto,
    laudoUrl: string,
  ): Promise<MedicalExamDto> {
    if (dto.validUntil <= new Date()) {
      throw new BadRequestException('validUntil must be in the future');
    }
    const existing = await this.prisma.medicalExam.findUnique({
      where: { studentId },
    });
    if (!existing) {
      throw new NotFoundException(
        'No medical exam scheduled — call /medical-exam/me/schedule first',
      );
    }
    const updated = await this.prisma.medicalExam.update({
      where: { id: existing.id },
      data: {
        result: dto.result,
        validUntil: dto.validUntil,
        restrictions: dto.restrictions ?? null,
        laudoUrl,
        status: 'RESULT_UPLOADED',
        performedAt: new Date(),
      },
    });
    await this.journey.refresh(studentId);
    return updated as MedicalExamDto;
  }

  async buildProtocolPdfBuffer(studentId: string): Promise<Buffer> {
    const exam = await this.prisma.medicalExam.findUnique({
      where: { studentId },
      include: { clinic: true },
    });
    if (!exam) {
      throw new NotFoundException('No medical exam to print protocol for');
    }
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    return buildProtocolPdf({
      protocolCode: exam.protocolCode,
      studentName: student?.name ?? 'Aluno',
      examType: 'Exame médico — 1ª CNH',
      clinicName: exam.clinic?.name ?? null,
      clinicAddress: exam.clinic?.address ?? null,
      scheduledAt: exam.scheduledAt ?? null,
    });
  }
}

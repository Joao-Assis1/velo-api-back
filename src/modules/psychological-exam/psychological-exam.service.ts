import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { SchedulePsychologicalExamDto } from './dto/schedule-exam.dto';
import { UploadPsychologicalLaudoDto } from './dto/upload-laudo.dto';
import { PsychologicalExamDto } from './dto/psychological-exam.dto';
import { buildProtocolPdf } from '../medical-exam/lib/protocol-pdf';

function newProtocolCode(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `PSY-${year}-${suffix}`;
}

@Injectable()
export class PsychologicalExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  async getMine(studentId: string): Promise<PsychologicalExamDto | null> {
    return (await this.prisma.psychologicalExam.findUnique({
      where: { studentId },
    })) as PsychologicalExamDto | null;
  }

  async schedule(
    studentId: string,
    dto: SchedulePsychologicalExamDto,
  ): Promise<PsychologicalExamDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic || !clinic.isActive || clinic.type !== 'PSYCHOLOGICAL') {
      throw new BadRequestException(
        'Selected clinic is not an active PSYCHOLOGICAL clinic',
      );
    }
    const protocolCode = newProtocolCode();
    const result = await this.prisma.psychologicalExam.upsert({
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
    return result as PsychologicalExamDto;
  }

  async uploadLaudo(
    studentId: string,
    dto: UploadPsychologicalLaudoDto,
    laudoUrl: string,
  ): Promise<PsychologicalExamDto> {
    if (dto.validUntil <= new Date()) {
      throw new BadRequestException('validUntil must be in the future');
    }
    const existing = await this.prisma.psychologicalExam.findUnique({
      where: { studentId },
    });
    if (!existing) {
      throw new NotFoundException(
        'No psychological exam scheduled — call /psychological-exam/me/schedule first',
      );
    }
    const updated = await this.prisma.psychologicalExam.update({
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
    return updated as PsychologicalExamDto;
  }

  async buildProtocolPdfBuffer(studentId: string): Promise<Buffer> {
    const exam = await this.prisma.psychologicalExam.findUnique({
      where: { studentId },
      include: { clinic: true },
    });
    if (!exam) {
      throw new NotFoundException(
        'No psychological exam to print protocol for',
      );
    }
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    return buildProtocolPdf({
      protocolCode: exam.protocolCode,
      studentName: student?.name ?? 'Aluno',
      examType: 'Avaliação psicológica — 1ª CNH',
      clinicName: exam.clinic?.name ?? null,
      clinicAddress: exam.clinic?.address ?? null,
      scheduledAt: exam.scheduledAt ?? null,
    });
  }
}

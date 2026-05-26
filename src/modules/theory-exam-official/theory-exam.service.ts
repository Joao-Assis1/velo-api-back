import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { RecordTheoryExamDto } from './dto/record-theory-exam.dto';
import { OfficialTheoryExamDto } from './dto/theory-exam.dto';

@Injectable()
export class TheoryExamOfficialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  async getMine(studentId: string): Promise<OfficialTheoryExamDto | null> {
    return (await this.prisma.officialTheoryExam.findUnique({
      where: { studentId },
    })) as OfficialTheoryExamDto | null;
  }

  async record(
    studentId: string,
    dto: RecordTheoryExamDto,
    proofUrl: string | null,
  ): Promise<OfficialTheoryExamDto> {
    const record = await this.prisma.officialTheoryExam.upsert({
      where: { studentId },
      create: {
        studentId,
        takenAt: dto.takenAt,
        score: dto.score ?? null,
        passed: dto.passed,
        proofUrl,
      },
      update: {
        takenAt: dto.takenAt,
        score: dto.score ?? null,
        passed: dto.passed,
        ...(proofUrl ? { proofUrl } : {}),
      },
    });
    await this.journey.refresh(studentId);
    return record as OfficialTheoryExamDto;
  }
}

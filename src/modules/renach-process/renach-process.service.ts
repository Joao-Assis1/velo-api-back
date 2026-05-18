import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { ScheduleRenachDto } from './dto/schedule-renach.dto';
import { CompleteRenachDto } from './dto/complete-renach.dto';
import { RenachProcessDto } from './dto/renach-process.dto';

const UF_GUIDES: Record<string, { steps: string[] }> = {
  MS: {
    steps: [
      'Acesse o portal do DETRAN-MS (https://www.meudetran.ms.gov.br/)',
      'No menu "Habilitação", inicie o processo de Primeira Habilitação categoria B',
      'Informe seus dados pessoais e selecione o CFC de sua preferência em Mato Grosso do Sul',
      'Agende a coleta biométrica em uma unidade do DETRAN-MS',
      'Compareça no dia marcado com RG, CPF e comprovante de residência',
    ],
  },
};

@Injectable()
export class RenachProcessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  getGuide(uf: string): { uf: string; steps: string[] } {
    const normalized = (uf ?? '').toUpperCase();
    const guide = UF_GUIDES[normalized];
    if (guide) return { uf: normalized, steps: guide.steps };
    return {
      uf: normalized,
      steps: [
        'Acesse o portal oficial do DETRAN da sua UF',
        'Abra o processo de 1ª habilitação informando RG e CPF',
        'Agende a biometria no posto mais próximo',
        'Compareça com a documentação solicitada pelo DETRAN local',
      ],
    };
  }

  async getMine(studentId: string): Promise<RenachProcessDto> {
    const r = await this.prisma.renachProcess.findUnique({
      where: { studentId },
    });
    if (!r) throw new NotFoundException('RENACH process not found');
    return r as RenachProcessDto;
  }

  async schedule(
    studentId: string,
    dto: ScheduleRenachDto,
  ): Promise<RenachProcessDto> {
    const r = await this.prisma.renachProcess.upsert({
      where: { studentId },
      create: {
        studentId,
        ufDetran: dto.uf.toUpperCase(),
        status: 'SCHEDULED',
      },
      update: {
        ufDetran: dto.uf.toUpperCase(),
        status: 'SCHEDULED',
      },
    });
    await this.journey.refresh(studentId);
    return r as RenachProcessDto;
  }

  async complete(
    studentId: string,
    dto: CompleteRenachDto,
    proofUrl?: string,
  ): Promise<RenachProcessDto> {
    const existing = await this.prisma.renachProcess.findUnique({
      where: { studentId },
    });
    if (!existing) {
      throw new BadRequestException(
        'No RENACH process to complete — call /renach/me/schedule first',
      );
    }
    const r = await this.prisma.renachProcess.update({
      where: { studentId },
      data: {
        renachNumber: dto.renachNumber,
        biometryDoneAt: dto.biometryDoneAt,
        status: 'DONE',
        ...(proofUrl ? { proofUrl } : {}),
      },
    });
    await this.journey.refresh(studentId);
    return r as RenachProcessDto;
  }
}

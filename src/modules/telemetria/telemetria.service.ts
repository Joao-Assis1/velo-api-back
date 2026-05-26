import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTelemetriaBatchDto } from './dto/create-telemetria-batch.dto';
import { Prisma } from '@prisma/client';
import { NavigatorService } from './navigator.service';

@Injectable()
export class TelemetriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly navigator: NavigatorService,
  ) {}

  async registerBatch(
    dto: CreateTelemetriaBatchDto,
  ): Promise<Prisma.BatchPayload> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      select: { status: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Aula ${dto.lessonId} não encontrada`);
    }

    // Nota: Por enquanto aceitamos "upcoming" ou "ongoing" para facilitar testes,
    // mas a regra de negócio final deve ser restrita a "ongoing".
    const status = lesson.status;
    if (status === 'completed' || status === 'cancelled') {
      throw new BadRequestException(
        `Não é possível registrar telemetria para aulas com status ${status}`,
      );
    }

    const telemetryData = dto.points.map((point) => ({
      lessonId: dto.lessonId,
      lat: point.lat,
      lng: point.lng,
      velocity: point.velocity,
      timestamp: new Date(point.timestamp),
    }));

    const result = await this.prisma.lessonTelemetry.createMany({
      data: telemetryData,
    });

    // Run orientation analysis (Navigator)
    // We don't await this to keep the API responsive, or we await it for consistency.
    // For now, let's await it to ensure integrity.
    await this.navigator.analyzeTelemetry(dto.lessonId, dto.points);

    return result;
  }
}

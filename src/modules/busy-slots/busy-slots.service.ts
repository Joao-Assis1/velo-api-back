import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusySlotDto, UpdateBusySlotDto } from './dtos';
import { randomUUID } from 'crypto';

@Injectable()
export class BusySlotsService {
  constructor(private prisma: PrismaService) {}

  // Validar que startTime < endTime
  private validateTimeRange(startTime: string, endTime: string) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes >= endMinutes) {
      throw new BadRequestException('startTime deve ser menor que endTime');
    }
  }

  // Validar que data não é no passado
  private validateDate(date: string) {
    const blockDate = new Date(date);
    const now = new Date();
    if (blockDate.setHours(0, 0, 0, 0) < now.setHours(0, 0, 0, 0)) {
      throw new BadRequestException('Não pode bloquear data no passado');
    }
  }

  // Validar conflito com aulas existentes
  private async validateNoLessonConflict(
    instructorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    const dateObj = new Date(date);
    const dayStart = new Date(dateObj.setHours(0, 0, 0, 0));
    const dayEnd = new Date(dateObj.setHours(23, 59, 59, 999));

    const conflictingLesson = await this.prisma.lesson.findFirst({
      where: {
        instructorId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: { not: 'cancelled' },
      },
    });

    if (conflictingLesson) {
      // Verificar sobrelposição exata
      const [lessonStartH, lessonStartM] = conflictingLesson.startTime
        .split(':')
        .map(Number);
      const [lessonEndH, lessonEndM] = conflictingLesson.endTime
        .split(':')
        .map(Number);
      const lessonStartMin = lessonStartH * 60 + lessonStartM;
      const lessonEndMin = lessonEndH * 60 + lessonEndM;

      const [blockStartH, blockStartM] = startTime.split(':').map(Number);
      const [blockEndH, blockEndM] = endTime.split(':').map(Number);
      const blockStartMin = blockStartH * 60 + blockStartM;
      const blockEndMin = blockEndH * 60 + blockEndM;

      const overlaps =
        blockStartMin < lessonEndMin && blockEndMin > lessonStartMin;
      if (overlaps) {
        throw new ConflictException(
          'Esta faixa horária já tem uma aula agendada',
        );
      }
    }
  }

  async create(dto: CreateBusySlotDto) {
    // Validações
    this.validateTimeRange(dto.startTime, dto.endTime);
    this.validateDate(dto.date);
    await this.validateNoLessonConflict(
      dto.instructorId,
      dto.date,
      dto.startTime,
      dto.endTime,
    );

    // Verificar se instrutor existe
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: dto.instructorId },
    });
    if (!instructor) {
      throw new NotFoundException('Instrutor não encontrado');
    }

    // Criar bloqueio
    return this.prisma.busySlot.create({
      data: {
        id: randomUUID(),
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findAll(instructorId: string, date?: string) {
    const where: any = { instructorId };

    if (date) {
      const dateObj = new Date(date);
      const dayStart = new Date(dateObj.setHours(0, 0, 0, 0));
      const dayEnd = new Date(dateObj.setHours(23, 59, 59, 999));
      where.date = {
        gte: dayStart,
        lte: dayEnd,
      };
    }

    return this.prisma.busySlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const busySlot = await this.prisma.busySlot.findUnique({
      where: { id },
    });

    if (!busySlot) {
      throw new NotFoundException('Bloqueio não encontrado');
    }

    return busySlot;
  }

  async update(id: string, dto: UpdateBusySlotDto) {
    const busySlot = await this.findOne(id);

    if (dto.startTime && dto.endTime) {
      this.validateTimeRange(dto.startTime, dto.endTime);
    }

    return this.prisma.busySlot.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.busySlot.delete({
      where: { id },
    });
  }
}

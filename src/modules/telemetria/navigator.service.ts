import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum LessonEventType {
  SPEED_LIMIT = 'SPEED_LIMIT',
  HARSH_BRAKING = 'HARSH_BRAKING',
  ROUTE_DEVIATION = 'ROUTE_DEVIATION',
  ENGINE_ON = 'ENGINE_ON',
  ENGINE_OFF = 'ENGINE_OFF',
}

@Injectable()
export class NavigatorService {
  private readonly logger = new Logger(NavigatorService.name);
  private readonly SPEED_THRESHOLD = 60; // km/h for student limit

  constructor(private prisma: PrismaService) {}

  /**
   * Registers a specific event during the lesson (The Navigator).
   */
  async registerEvent(data: {
    lessonId: string;
    type: LessonEventType;
    message: string;
    lat: number;
    lng: number;
  }) {
    this.logger.log(
      `Registering orientation event: ${data.type} for lesson ${data.lessonId}`,
    );

    return this.prisma.lessonEvent.create({
      data: {
        lessonId: data.lessonId,
        type: data.type,
        message: data.message,
        lat: data.lat,
        lng: data.lng,
      },
    });
  }

  /**
   * Analyzes a batch of telemetry points and auto-detects events.
   */
  async analyzeTelemetry(lessonId: string, points: any[]) {
    for (const point of points) {
      // 1. Check for speeding
      if (point.velocity > this.SPEED_THRESHOLD) {
        await this.registerEvent({
          lessonId,
          type: LessonEventType.SPEED_LIMIT,
          message: `Velocidade de ${point.velocity}km/h excede o limite de ${this.SPEED_THRESHOLD}km/h.`,
          lat: point.lat,
          lng: point.lng,
        });
      }

      // Note: Harsh braking detection would require comparing velocity between consecutive points.
      // For this MVP, we focus on Speed Limit alerts.
    }
  }

  /**
   * Returns all orientation events for a lesson.
   */
  async getLessonEvents(lessonId: string) {
    return this.prisma.lessonEvent.findMany({
      where: { lessonId },
      orderBy: { timestamp: 'asc' },
    });
  }
}

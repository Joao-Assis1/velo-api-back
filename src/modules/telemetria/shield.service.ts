import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShieldService {
  private readonly logger = new Logger(ShieldService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generates a SHA-256 integrity hash for a lesson based on its telemetry points.
   * Following CONTRAN 1.020/2025 standards for data integrity.
   */
  async generateLessonHash(lessonId: string): Promise<string> {
    this.logger.log(`Generating integrity hash for lesson: ${lessonId}`);

    // 1. Fetch all telemetry points for the lesson, sorted by timestamp
    const telemetryPoints = await this.prisma.lessonTelemetry.findMany({
      where: { lessonId },
      orderBy: { timestamp: 'asc' },
    });

    if (telemetryPoints.length === 0) {
      this.logger.warn(
        `No telemetry points found for lesson ${lessonId}. Generating empty-data hash.`,
      );
    }

    // 2. Concatenate data into a single string
    // Format: lessonId|timestamp|lat|lng|velocity
    const dataString = telemetryPoints
      .map((p) => {
        return `${p.lessonId}|${p.timestamp.toISOString()}|${p.lat}|${p.lng}|${p.velocity}`;
      })
      .join(';');

    // 3. Create SHA-256 hash
    const hash = createHash('sha256').update(dataString).digest('hex');

    this.logger.debug(`Hash generated for ${lessonId}: ${hash}`);
    return hash;
  }
}

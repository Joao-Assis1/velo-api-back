import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';

@ApiExcludeController()
@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('instructors/:id/approve')
  @HttpCode(200)
  async approveInstructor(@Param('id') id: string) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id },
      select: { id: true, credentialValidUntil: true },
    });
    if (!instructor) throw new NotFoundException(`Instructor ${id} not found`);

    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

    const validUntil =
      instructor.credentialValidUntil &&
      instructor.credentialValidUntil > new Date()
        ? instructor.credentialValidUntil
        : twoYearsFromNow;

    const updated = await this.prisma.instructor.update({
      where: { id },
      data: {
        credentialStatus: 'APPROVED',
        credentialValidUntil: validUntil,
      },
      select: {
        id: true,
        email: true,
        credentialStatus: true,
        credentialValidUntil: true,
      },
    });

    return { message: 'Instructor approved', instructor: updated };
  }

  @Post('lessons/:lessonId/resolve-dispute')
  @HttpCode(200)
  resolveDispute(
    @Param('lessonId') lessonId: string,
    @Body() dto: { action: 'release' | 'refund'; reason?: string },
  ) {
    return this.paymentsService.resolveDispute(lessonId, dto);
  }

  @Get('payments/release-failed')
  listReleaseFailed() {
    return this.paymentsService.listReleaseFailed();
  }

  @Post('payments/:paymentId/resolve')
  @HttpCode(200)
  resolveReleaseFailed(
    @Param('paymentId') paymentId: string,
    @Body() dto: { action: 'retry' | 'refund'; reason?: string },
  ) {
    return this.paymentsService.resolveReleaseFailed(paymentId, dto);
  }
}

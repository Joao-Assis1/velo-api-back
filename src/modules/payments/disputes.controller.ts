import { Controller, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post(':lessonId/open')
  openDispute(
    @Param('lessonId') lessonId: string,
    @Body('reason') reason: string,
  ) {
    return this.disputesService.openDispute(lessonId, reason);
  }

  @Patch(':lessonId/resolve')
  resolveDispute(
    @Param('lessonId') lessonId: string,
    @Body('released') released: boolean,
  ) {
    return this.disputesService.resolveDispute(lessonId, released);
  }
}

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AcademyService } from './academy.service';
import { ApiTags } from '@nestjs/swagger';
import { AdminApiKeyGuard } from '../admin/guards/admin-api-key.guard';

@ApiTags('academy')
@Controller('academy')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('simulado')
  getSimulado() {
    return this.academyService.getSimulado();
  }

  @Post('simulado/submit')
  submitSimulado(
    @Body('studentId') studentId: string,
    @Body('answers') answers: { questionId: string; answer: number }[],
    @Body('startedAt') startedAt: string,
  ) {
    return this.academyService.submitSimulado(studentId, answers, startedAt);
  }

  @Post('seed')
  @UseGuards(AdminApiKeyGuard)
  seed() {
    return this.academyService.seedQuestions();
  }
}

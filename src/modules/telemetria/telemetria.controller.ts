import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TelemetriaService } from './telemetria.service';
import { CreateTelemetriaBatchDto } from './dto/create-telemetria-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NavigatorService } from './navigator.service';

@ApiTags('telemetria')
@Controller('telemetria')
export class TelemetriaController {
  constructor(
    private readonly telemetriaService: TelemetriaService,
    private readonly navigator: NavigatorService,
  ) {}

  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Registrar lote de pontos de telemetria' })
  @ApiResponse({ status: 201, description: 'Lote registrado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou status de aula incompatível',
  })
  @ApiResponse({ status: 404, description: 'Aula não encontrada' })
  async createBatch(
    @Body() createTelemetriaBatchDto: CreateTelemetriaBatchDto,
  ) {
    return this.telemetriaService.registerBatch(createTelemetriaBatchDto);
  }

  @Get('lesson/:lessonId/events')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obter eventos de orientação (Navegador) de uma aula',
  })
  async getEvents(@Param('lessonId') lessonId: string) {
    return this.navigator.getLessonEvents(lessonId);
  }
}

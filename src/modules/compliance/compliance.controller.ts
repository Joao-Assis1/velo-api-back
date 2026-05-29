import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { PracticalSummaryDto } from './dto/practical-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('students/:studentId')
  @ApiOperation({
    summary: 'Relatório de conformidade CONTRAN 1.020/2025 do aluno',
    description:
      'Retorna o checklist de 2 etapas (teórico e prático). Ambas são derivadas automaticamente do simulado e das aulas concluídas.',
  })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  getComplianceReport(@Param('studentId') studentId: string) {
    return this.complianceService.getComplianceReport(studentId);
  }

  @Get('students/:studentId/practical-summary')
  @ApiOperation({
    summary: 'Resumo da fase prática (CONTRAN 1.020/2025)',
    description:
      'Soma minutos de aulas válidas conforme isValidForCompliance: status=completed, durationMinutes>=50, biometria 3 pontos SUCCESS, integrityHash não-nulo, disputeOpened=false.',
  })
  @ApiResponse({ status: 200, type: PracticalSummaryDto })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  getPracticalSummary(@Param('studentId') studentId: string) {
    return this.complianceService.getPracticalSummary(studentId);
  }
}

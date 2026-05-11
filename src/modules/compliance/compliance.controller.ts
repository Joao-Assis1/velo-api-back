import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { UpdateComplianceStepDto } from './dto/update-compliance-step.dto';
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
      'Retorna o checklist de 4 etapas. Teórico e prático são derivados automaticamente do simulado e das aulas concluídas.',
  })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  getComplianceReport(@Param('studentId') studentId: string) {
    return this.complianceService.getComplianceReport(studentId);
  }

  @Patch('students/:studentId/step')
  @ApiOperation({
    summary: 'Atualizar etapa manual (médico ou psicotécnico)',
    description:
      'Apenas etapas medico e psicotecnico podem ser atualizadas manualmente. Teórico e prático são derivados automaticamente.',
  })
  @ApiResponse({ status: 200, description: 'Etapa atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Etapa inválida para atualização manual' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  updateManualStep(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateComplianceStepDto,
  ) {
    return this.complianceService.updateManualStep(studentId, dto);
  }
}

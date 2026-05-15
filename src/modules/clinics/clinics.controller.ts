import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { ListClinicsQueryDto } from './dto/list-clinics-query.dto';
import { ClinicDto, PaginatedClinicsDto } from './dto/clinic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('clinics')
@ApiBearerAuth()
@Controller('clinics')
@UseGuards(JwtAuthGuard)
export class ClinicsController {
  constructor(private readonly clinics: ClinicsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedClinicsDto })
  list(@Query() query: ListClinicsQueryDto): Promise<PaginatedClinicsDto> {
    return this.clinics.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ClinicDto })
  findOne(@Param('id') id: string): Promise<ClinicDto> {
    return this.clinics.findById(id);
  }
}

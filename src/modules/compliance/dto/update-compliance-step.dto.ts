import { IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateComplianceStepDto {
  @ApiProperty({ enum: ['medico', 'psicotecnico'] })
  @IsIn(['medico', 'psicotecnico'], {
    message: 'Only medico and psicotecnico can be updated manually',
  })
  step: 'medico' | 'psicotecnico';

  @ApiProperty()
  @IsBoolean()
  completed: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['release', 'refund'] })
  @IsIn(['release', 'refund'])
  action!: 'release' | 'refund';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

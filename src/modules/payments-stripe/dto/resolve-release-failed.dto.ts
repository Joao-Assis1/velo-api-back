import { IsIn, IsOptional, IsString } from 'class-validator';

export class ResolveReleaseFailedDto {
  @IsIn(['retry', 'refund'])
  action!: 'retry' | 'refund';

  @IsOptional()
  @IsString()
  reason?: string;
}

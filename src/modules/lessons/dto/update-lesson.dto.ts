import { IsOptional, IsString } from 'class-validator';

export class UpdateLessonDto {
  @IsString()
  @IsOptional()
  status?: string;
}

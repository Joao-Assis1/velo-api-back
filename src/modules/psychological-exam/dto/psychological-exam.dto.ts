import { ApiProperty } from '@nestjs/swagger';

export class PsychologicalExamDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ required: false, nullable: true })
  clinicId!: string | null;
  @ApiProperty()
  protocolCode!: string;
  @ApiProperty({ required: false, nullable: true })
  scheduledAt!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  performedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  result!: string | null;
  @ApiProperty({ required: false, nullable: true })
  restrictions!: string | null;
  @ApiProperty({ required: false, nullable: true })
  validUntil!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  laudoUrl!: string | null;
  @ApiProperty()
  status!: string;
  @ApiProperty({ required: false, nullable: true })
  rejectionReason!: string | null;
}

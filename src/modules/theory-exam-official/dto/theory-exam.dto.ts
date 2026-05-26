import { ApiProperty } from '@nestjs/swagger';

export class OfficialTheoryExamDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  takenAt!: Date;
  @ApiProperty({ required: false, nullable: true })
  score!: number | null;
  @ApiProperty()
  passed!: boolean;
  @ApiProperty({ required: false, nullable: true })
  proofUrl!: string | null;
  @ApiProperty()
  createdAt!: Date;
}

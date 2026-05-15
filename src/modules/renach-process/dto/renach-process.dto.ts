import { ApiProperty } from '@nestjs/swagger';

export class RenachProcessDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  renachNumber!: string | null;

  @ApiProperty()
  ufDetran!: string;

  @ApiProperty({ required: false, nullable: true })
  biometryDoneAt!: Date | null;

  @ApiProperty({ enum: ['PENDING', 'SCHEDULED', 'DONE'] })
  status!: string;

  @ApiProperty({ required: false, nullable: true })
  proofUrl!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

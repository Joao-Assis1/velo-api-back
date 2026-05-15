import { ApiProperty } from '@nestjs/swagger';

export class ClinicDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['MEDICAL', 'PSYCHOLOGICAL'] })
  type!: 'MEDICAL' | 'PSYCHOLOGICAL';

  @ApiProperty()
  city!: string;

  @ApiProperty()
  uf!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty({ required: false })
  phone?: string | null;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  isActive!: boolean;
}

export class PaginatedClinicsDto {
  @ApiProperty({ type: [ClinicDto] })
  items!: ClinicDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class RegisterBiometryDto {
  @ApiProperty({ example: -23.55052 })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({ example: -46.633308 })
  @IsNumber()
  @IsNotEmpty()
  lng: number;

  @ApiProperty({
    example: 'SUCCESS',
    description: 'Status retornado pelo SDK de Biometria do App',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: 'start', enum: ['start', 'mid', 'end'] })
  @IsString()
  @IsNotEmpty()
  step: 'start' | 'mid' | 'end';
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ValidationService } from './validation.service';
import { ValidateCpfDto } from './dto/validate-cpf.dto';
import { ValidateCnhDto } from './dto/validate-cnh.dto';
import { ValidateCepDto } from './dto/validate-cep.dto';
import { ValidatePlateDto } from './dto/validate-plate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('validation')
@ApiBearerAuth()
@Controller('validation')
@UseGuards(JwtAuthGuard)
export class ValidationController {
  constructor(private readonly validation: ValidationService) {}

  @Post('cpf')
  @ApiOkResponse({ description: 'Local CPF validation' })
  cpf(@Body() dto: ValidateCpfDto) {
    return this.validation.validateCpf(dto.cpf);
  }

  @Post('cnh')
  @ApiOkResponse({ description: 'Local + external CNH validation' })
  cnh(@Body() dto: ValidateCnhDto) {
    return this.validation.validateCnh(dto.cnhNumber, dto.cpf);
  }

  @Post('cep')
  @ApiOkResponse({ description: 'ViaCEP address lookup' })
  cep(@Body() dto: ValidateCepDto) {
    return this.validation.validateCep(dto.cep);
  }

  @Post('vehicle-plate')
  @ApiOkResponse({ description: 'BrasilAPI plate → vehicle info' })
  plate(@Body() dto: ValidatePlateDto) {
    return this.validation.validateVehiclePlate(dto.plate);
  }
}

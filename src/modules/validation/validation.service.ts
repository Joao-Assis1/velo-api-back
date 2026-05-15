import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateCpf } from './lib/cpf.validator';
import { validateCnh as validateCnhLocal } from './lib/cnh.validator';
import type { DocumentValidationProvider } from './providers/document-validation.provider';
import { DOCUMENT_VALIDATION_PROVIDER } from './providers/document-validation.provider';

export interface CepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface PlateInfo {
  marca: string;
  modelo: string;
  ano: number;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    @Inject(DOCUMENT_VALIDATION_PROVIDER)
    private readonly provider: DocumentValidationProvider,
    private readonly config: ConfigService,
  ) {}

  validateCpf(cpf: string) {
    return validateCpf(cpf);
  }

  async validateCnh(cnhNumber: string, cpf: string) {
    const local = validateCnhLocal(cnhNumber);
    if (!local.valid) {
      return { valid: false, status: 'LOCAL_INVALID', expiresAt: null };
    }
    const external = await this.provider.validateCnh(
      local.normalized as string,
      cpf,
    );
    return {
      valid: external.valid,
      status: external.status,
      expiresAt: external.expiresAt ?? null,
    };
  }

  async validateCep(cep: string): Promise<CepAddress> {
    const digits = (cep ?? '').replace(/\D/g, '');
    if (digits.length !== 8) {
      throw new BadRequestException('CEP must have exactly 8 digits');
    }
    const base =
      this.config.get<string>('VIA_CEP_BASE_URL') ?? 'https://viacep.com.br/ws';
    try {
      const res = await fetch(`${base}/${digits}/json/`);
      if (!res.ok) {
        throw new BadRequestException(`ViaCEP returned ${res.status}`);
      }
      const body = (await res.json()) as Record<string, unknown>;
      if ((body as { erro?: boolean }).erro) {
        throw new NotFoundException(`CEP ${digits} not found`);
      }
      return {
        cep: String(body.cep ?? ''),
        logradouro: String(body.logradouro ?? ''),
        bairro: String(body.bairro ?? ''),
        cidade: String(body.localidade ?? ''),
        uf: String(body.uf ?? ''),
      };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      this.logger.warn(`ViaCEP fetch failed: ${(e as Error).message}`);
      throw new BadRequestException(
        `ViaCEP request failed: ${(e as Error).message}`,
      );
    }
  }

  async validateVehiclePlate(plate: string): Promise<PlateInfo> {
    const normalized = (plate ?? '').replace(/\W/g, '').toUpperCase();
    if (!/^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(normalized)) {
      throw new BadRequestException('Invalid plate format');
    }
    const base =
      this.config.get<string>('BRASIL_API_BASE_URL') ??
      'https://brasilapi.com.br/api';
    try {
      const res = await fetch(
        `${base}/fipe/marcas/v1/cars?placa=${normalized}`,
      );
      if (res.status === 404) {
        throw new NotFoundException(`Plate ${normalized} not found`);
      }
      if (!res.ok) {
        throw new BadRequestException(
          `BrasilAPI returned status ${res.status}`,
        );
      }
      const body = (await res.json()) as Record<string, unknown>;
      return {
        marca: String(body.marca ?? ''),
        modelo: String(body.modelo ?? ''),
        ano: Number(body.ano ?? 0),
      };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      this.logger.warn(`BrasilAPI fetch failed: ${(e as Error).message}`);
      throw new BadRequestException(
        `BrasilAPI request failed: ${(e as Error).message}`,
      );
    }
  }
}

import { Injectable } from '@nestjs/common';
import {
  CnhExternalCheck,
  DocumentValidationProvider,
  FaceMatchResult,
  RenachExternalCheck,
} from './document-validation.provider';

@Injectable()
export class MockValidationProvider implements DocumentValidationProvider {
  private readonly knownCnh = new Map<string, CnhExternalCheck>([
    [
      '02650306461',
      {
        valid: true,
        status: 'VALID',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    ],
    ['99999999999', { valid: false, status: 'EXPIRED' }],
    ['88888888888', { valid: false, status: 'SUSPENDED' }],
  ]);

  async validateCnh(
    cnhNumber: string,
    _cpf: string,
  ): Promise<CnhExternalCheck> {
    await new Promise((r) => setTimeout(r, 50));
    const normalized = (cnhNumber ?? '').replace(/\D/g, '');
    return (
      this.knownCnh.get(normalized) ?? { valid: false, status: 'NOT_FOUND' }
    );
  }

  async validateRenach(
    renach: string,
    _cpf: string,
  ): Promise<RenachExternalCheck> {
    await new Promise((r) => setTimeout(r, 50));
    if (typeof renach === 'string' && /^[A-Z]{2}\d{9}$/.test(renach)) {
      return { valid: true, processStatus: 'OPEN' };
    }
    return { valid: false, processStatus: 'NOT_FOUND' };
  }

  async matchFaceWithCnh(
    _cpf: string,
    _faceImageBase64: string,
  ): Promise<FaceMatchResult> {
    await new Promise((r) => setTimeout(r, 50));
    return { similarity: 0.92, match: true };
  }
}

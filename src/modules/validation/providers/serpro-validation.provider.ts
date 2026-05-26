import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  CnhExternalCheck,
  DocumentValidationProvider,
  FaceMatchResult,
  RenachExternalCheck,
} from './document-validation.provider';

@Injectable()
export class SerproValidationProvider implements DocumentValidationProvider {
  async validateCnh(): Promise<CnhExternalCheck> {
    throw new NotImplementedException(
      'SERPRO provider is not implemented in the MVP — set DOCUMENT_VALIDATION_PROVIDER=mock',
    );
  }
  async validateRenach(): Promise<RenachExternalCheck> {
    throw new NotImplementedException();
  }
  async matchFaceWithCnh(): Promise<FaceMatchResult> {
    throw new NotImplementedException();
  }
}

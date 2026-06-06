import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  CnhExternalCheck,
  DocumentValidationProvider,
  FaceMatchResult,
  RenachExternalCheck,
} from './document-validation.provider';

@Injectable()
export class SerproValidationProvider implements DocumentValidationProvider {
  validateCnh(): Promise<CnhExternalCheck> {
    return Promise.reject(
      new NotImplementedException(
        'SERPRO provider is not implemented in the MVP — set DOCUMENT_VALIDATION_PROVIDER=mock',
      ),
    );
  }
  validateRenach(): Promise<RenachExternalCheck> {
    return Promise.reject(new NotImplementedException());
  }
  matchFaceWithCnh(): Promise<FaceMatchResult> {
    return Promise.reject(new NotImplementedException());
  }
}

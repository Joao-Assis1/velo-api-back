export const DOCUMENT_VALIDATION_PROVIDER = Symbol(
  'DOCUMENT_VALIDATION_PROVIDER',
);

export interface CnhExternalCheck {
  valid: boolean;
  status: string; // VALID | EXPIRED | SUSPENDED | NOT_FOUND
  expiresAt?: Date;
}

export interface RenachExternalCheck {
  valid: boolean;
  processStatus?: string; // OPEN | DONE | NOT_FOUND
}

export interface FaceMatchResult {
  similarity: number;
  match: boolean;
}

export interface DocumentValidationProvider {
  validateCnh(cnhNumber: string, cpf: string): Promise<CnhExternalCheck>;
  validateRenach(renach: string, cpf: string): Promise<RenachExternalCheck>;
  matchFaceWithCnh(
    cpf: string,
    faceImageBase64: string,
  ): Promise<FaceMatchResult>;
}

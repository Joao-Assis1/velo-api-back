export interface AsaasCustomerDto {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface AsaasTokenizeCardDto {
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone?: string;
  };
  customer: string;
  remoteIp: string;
}

export interface AsaasCreateChargeDto {
  customer: string;
  billingType: 'CREDIT_CARD';
  value: number;
  dueDate: string;
  creditCardToken: string;
  externalReference?: string;
  description?: string;
}

export interface AsaasTransferDto {
  value: number;
  pixAddressKey?: string;
  pixAddressKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
  bankAccount?: {
    bank: { code: string };
    accountName: string;
    ownerName: string;
    cpfCnpj: string;
    agency: string;
    account: string;
    accountDigit: string;
    bankAccountType: 'CONTA_CORRENTE' | 'CONTA_POUPANCA';
  };
  description?: string;
}

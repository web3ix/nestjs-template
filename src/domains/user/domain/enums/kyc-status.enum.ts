// Single source of truth for KYC status values
export const KYC_STATUS_VALUES = [
  'NONE',
  'PENDING',
  'VERIFIED',
  'REJECTED',
] as const;

export type KycStatusValue = (typeof KYC_STATUS_VALUES)[number];

export enum KycStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum ErrorCode {
  // Common Validation
  V000 = 'common.validation.error',

  // Validation
  V001 = 'app.validation.is_empty',
  V002 = 'app.validation.is_invalid',
  V003 = 'app.validation.insufficient_balance',
  V004 = 'app.validation.payment_method_required',

  // Error
  E001 = 'app.error.email_exists',
  E002 = 'app.error.not_found',
  E003 = 'app.error.email_not_verify',
  E004 = 'app.error.network_not_supported',
  E005 = 'app.error.method_not_supported',
}

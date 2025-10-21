import { TokenField } from '@/common/decorators/field.decorators';

export class VerifyReqDto {
  @TokenField()
  token!: string;
}

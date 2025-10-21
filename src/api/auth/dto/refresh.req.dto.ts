import { TokenField } from '@/common/decorators/field.decorators';

export class RefreshReqDto {
  @TokenField()
  refreshToken!: string;
}

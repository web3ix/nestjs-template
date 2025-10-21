import { StringField } from '@/common/decorators/field.decorators';

export class GoogleReqDto {
  @StringField()
  token!: string;
}

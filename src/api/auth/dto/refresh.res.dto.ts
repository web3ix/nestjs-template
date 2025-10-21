import { NumberField, StringField } from '@/common/decorators/field.decorators';

export class RefreshResDto {
  @StringField()
  accessToken!: string;

  @StringField()
  refreshToken!: string;

  @NumberField()
  tokenExpires!: number;
}

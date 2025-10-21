import { StringField } from '@/common/decorators/field.decorators';
import { Uuid } from '@/common/types/uuid.type';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RegisterResDto {
  @Expose()
  @StringField()
  userId!: Uuid;
}

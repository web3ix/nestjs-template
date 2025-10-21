import {
  EmailField,
  PasswordField,
} from '@/common/decorators/field.decorators';

export class RegisterReqDto {
  @EmailField()
  email!: string;

  @PasswordField()
  password!: string;
}

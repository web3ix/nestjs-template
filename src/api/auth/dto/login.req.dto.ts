import {
  EmailField,
  PasswordField,
} from '@/common/decorators/field.decorators';

export class LoginReqDto {
  @EmailField()
  email!: string;

  @PasswordField()
  password!: string;
}

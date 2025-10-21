import { IS_AUTH_ROLE } from '@/constants/app.constant';
import { Role } from '@/constants/auth.constant';
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: Role[]) => SetMetadata(IS_AUTH_ROLE, roles);

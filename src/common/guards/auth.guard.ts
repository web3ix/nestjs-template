import { AuthService } from '@/api/auth/auth.service';
import {
  IS_AUTH_OPTIONAL,
  IS_AUTH_ROLE,
  IS_PUBLIC,
} from '@/constants/app.constant';
import { Role } from '@/constants/auth.constant';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const accessToken = this.extractTokenFromHeader(request);

    if (isAuthOptional && !accessToken) {
      return true;
    }
    if (!accessToken) {
      throw new UnauthorizedException();
    }

    try {
      request['user'] = await this.authService.verifyAccessToken(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const authRoles = this.reflector.getAllAndOverride<Role[]>(IS_AUTH_ROLE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (authRoles.length) {
      if (authRoles.some((role) => role === (request['user'].role as Role)))
        return true;
      return false;
    }

    return true;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

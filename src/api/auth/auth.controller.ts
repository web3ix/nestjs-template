import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/common/decorators/http.decorators';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleReqDto } from './dto/google.req.dto';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';
import { RefreshReqDto } from './dto/refresh.req.dto';
import { RefreshResDto } from './dto/refresh.res.dto';
import { RegisterReqDto } from './dto/register.req.dto';
import { RegisterResDto } from './dto/register.res.dto';
import { VerifyReqDto } from './dto/verify.req.dto';
import { JwtPayloadType } from './types/jwt-payload.type';

@ApiTags('Authenticate')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiPublic({
    type: LoginResDto,
    summary: 'Sign in',
  })
  @Post('email/login')
  async signIn(@Body() userLogin: LoginReqDto): Promise<LoginResDto> {
    return await this.authService.signIn(userLogin);
  }

  @ApiPublic({
    type: GoogleReqDto,
    summary: 'Sign In using Google',
  })
  @Post('google')
  async signInByGoogle(@Body() dto: GoogleReqDto): Promise<LoginResDto> {
    return await this.authService.signInByGoogle(dto);
  }

  @ApiPublic({
    type: RegisterReqDto,
    summary: 'Sign Up using email and password',
  })
  @Post('email/register')
  async register(@Body() dto: RegisterReqDto): Promise<RegisterResDto> {
    return await this.authService.register(dto);
  }

  @ApiAuth({
    summary: 'Logout',
    errorResponses: [400, 401, 403, 500],
  })
  @Get('logout')
  async logout(@CurrentUser() userToken: JwtPayloadType): Promise<void> {
    await this.authService.logout(userToken);
  }

  @ApiPublic({
    type: RefreshResDto,
    summary: 'Refresh token',
  })
  @Post('refresh')
  async refresh(@Body() dto: RefreshReqDto): Promise<RefreshResDto> {
    return await this.authService.refreshToken(dto);
  }

  @ApiPublic()
  @Post('forgot-password')
  async forgotPassword() {
    return 'forgot-password';
  }

  @ApiPublic()
  @Post('verify/forgot-password')
  async verifyForgotPassword() {
    return 'verify-forgot-password';
  }

  @ApiPublic()
  @Post('reset-password')
  async resetPassword() {
    return 'reset-password';
  }

  @ApiPublic()
  @Get('verify/email')
  async verifyEmail(@Query() dto: VerifyReqDto) {
    return this.authService.verifyEmail(dto);
  }

  @ApiPublic()
  @Post('verify/email/resend')
  async resendVerifyEmail() {
    return 'resend-verify-email';
  }
}

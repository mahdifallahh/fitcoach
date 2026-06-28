import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AppConfigService } from '../../config/config.module';
import { AuthService, AuthResult } from './auth.service';
import { TokenService, REFRESH_COOKIE } from './token.service';
import { RequestMagicLinkDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { AuthUser } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.identifier);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyOtp(dto.identifier, dto.code, dto.role, req.headers['user-agent']);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('magic-link/request')
  async requestMagicLink(@Body() dto: RequestMagicLinkDto) {
    await this.auth.requestMagicLink(dto.identifier, dto.role);
    return { sent: true };
  }

  @Public()
  @Get('magic-link/consume')
  async consumeMagicLink(
    @Query('token') token: string,
    @Query('role') role: Role | undefined,
    @Query('locale') locale: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.auth.consumeMagicLink(token, role, req.headers['user-agent']);
    this.setAuthCookies(res, result);
    const loc = locale === 'en' ? 'en' : 'fa';
    const dest = result.user.role === Role.COACH ? 'coach' : 'student';
    res.redirect(`${this.config.get('FRONTEND_ORIGIN')}/${loc}/${dest}`);
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    const result = await this.auth.refresh(raw, req.headers['user-agent']);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    for (const c of this.tokens.clearCookies()) res.cookie(c.name, c.value, c.options);
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private setAuthCookies(res: Response, result: AuthResult): void {
    const access = this.tokens.buildAccessCookie(result.accessToken);
    const refresh = this.tokens.buildRefreshCookie(result.refreshToken);
    res.cookie(access.name, access.value, access.options);
    res.cookie(refresh.name, refresh.value, refresh.options);
  }
}

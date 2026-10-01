import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { email, loginSchema, password, registerSchema } from '@mitti/validation';
import { AuthService } from './auth.service';
import { ok, parse, Require, RequestContext } from '../../common/http';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('login')
  @ApiOperation({ summary: 'Create an HttpOnly cookie session' })
  async login(@Body() body: unknown, @Req() req: RequestContext, @Res({ passthrough: true }) res: Response) {
    const data = parse(loginSchema, body);
    return ok(await this.auth.login(data.email, data.password, req, res));
  }
  @Post('register') async register(
    @Body() body: unknown,
    @Req() req: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    return ok(await this.auth.register(parse(registerSchema, body), req, res));
  }
  @Post('logout') async logout(@Req() req: RequestContext, @Res({ passthrough: true }) res: Response) {
    return ok(await this.auth.logout(req, res));
  }
  @Get('me') @Require() me(@Req() req: RequestContext) {
    return ok(req.user);
  }
  @Post('refresh') @Require() async refresh(
    @Req() req: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    return ok(await this.auth.refresh(req, res));
  }
  @Post('forgot-password') async forgot(@Body() body: unknown) {
    return ok(await this.auth.forgot(parse(z.object({ email }).strict(), body).email));
  }
  @Post('reset-password') async reset(@Body() body: unknown) {
    const data = parse(z.object({ token: z.string().length(64), password }).strict(), body);
    return ok(await this.auth.consume(data.token, 'reset', data.password));
  }
  @Post('verify-email') async verify(@Body() body: unknown) {
    return ok(
      await this.auth.consume(
        parse(z.object({ token: z.string().length(64) }).strict(), body).token,
        'verify',
      ),
    );
  }
}

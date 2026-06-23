import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChallengeQueryDto } from './dto/challenge-query.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Step 1 — generate a nonce for the client to sign.
   * GET /auth/challenge?address=G...
   */
  @Get('challenge')
  getChallenge(@Query() query: ChallengeQueryDto): Promise<{ nonce: string }> {
    return this.authService.generateChallenge(query.address);
  }

  /**
   * Step 2 — verify wallet signature and issue JWT.
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<{ accessToken: string; user: object }> {
    return this.authService.login(dto);
  }
}

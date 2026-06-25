import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ChallengeQueryDto, LoginDto, LogoutDto, RefreshDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /auth/challenge?publicKey=G…
   * Returns a base64-encoded SEP-10 challenge XDR.
   * Requirements 1.1, 15.5
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Get('challenge')
  async challenge(@Query() query: ChallengeQueryDto) {
    return this.authService.generateChallenge(query.publicKey);
  }

  /**
   * POST /auth/login
   * Verify signed SEP-10 challenge and return JWT pair.
   * Requirements 1.2, 1.3, 15.5
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.verifyChallengeAndLogin(dto.signedTransaction);
  }

  /**
   * POST /auth/refresh
   * Exchange a refresh token for a new access token.
   * Requirements 1.4, 1.5
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  /**
   * POST /auth/logout
   * Invalidate the current refresh token.
   * Requirement 1.6
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }
}

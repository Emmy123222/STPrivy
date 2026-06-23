import { Controller, Get, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DIDService, DIDDocument } from './did.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('did')
export class DIDController {
  constructor(private readonly didService: DIDService) {}

  /**
   * Create a DID for the authenticated user.
   * POST /did/create
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthenticatedUser): Promise<DIDDocument> {
    return this.didService.createDID(user.userId, user.address);
  }

  /**
   * Resolve a DID by Stellar address (public endpoint).
   * GET /did/:address
   */
  @Get(':address')
  resolve(@Param('address') address: string): Promise<DIDDocument> {
    return this.didService.resolveDID(address);
  }
}

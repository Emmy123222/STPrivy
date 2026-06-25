import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IsOptional, IsDateString, IsString, IsNotEmpty, IsBoolean, IsInt, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { CredentialService } from './credential.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class SelfIssueDto {
  @IsString() @IsNotEmpty() @Length(2, 2)
  country!: string;

  @IsInt() @Min(0) @Max(150) @Type(() => Number)
  age!: number;

  @IsBoolean()
  accredited!: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

@Controller('credentials')
export class CredentialController {
  constructor(
    private readonly credentialService: CredentialService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** GET /credentials — authenticated user's received credentials */
  @Get()
  @UseGuards(JwtAuthGuard)
  async myCredentials(@CurrentUser() user: AuthenticatedUser) {
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    if (!did) return [];
    return this.credentialService.listBySubject(did.id);
  }

  /** GET /credentials/issued — credentials issued by this user */
  @Get('issued')
  @UseGuards(JwtAuthGuard)
  async issuedCredentials(@CurrentUser() user: AuthenticatedUser) {
    return this.credentialService.listByIssuer(`did:stellar:${user.address}`);
  }

  /**
   * POST /credentials/issue
   * Subject self-submits KYC claims. The platform's configured issuer signs the VC.
   */
  @Post('issue')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async selfIssue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelfIssueDto,
  ) {
    // 1. Require the user to have a DID
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    if (!did) {
      throw new BadRequestException('Create your DID first via POST /did/create');
    }

    // 2. Ensure the platform issuer exists in DB (upsert from env config)
    const issuerAddress =
      this.config.get<string>('ISSUER_PUBLIC_KEY') ??
      this.config.get<string>('STELLAR_SERVER_PUBLIC')!;
    const issuerDID = `did:stellar:${issuerAddress}`;

    await this.prisma.issuer.upsert({
      where: { stellarAddress: issuerAddress },
      create: {
        did: issuerDID,
        stellarAddress: issuerAddress,
        name: 'STPrivy KYC Service',
        active: true,
      },
      update: { active: true },
    });

    // 3. Issue the verifiable credential
    return this.credentialService.issueCredential(
      issuerDID,
      did.id,
      { country: dto.country, age: dto.age, accredited: dto.accredited },
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
  }

  /** POST /credentials/:id/revoke — revoke a credential in DB and on-chain */
  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard)
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Derive the caller's DID string from their Stellar address (same format stored on Issuer record)
    const callerDID = `did:stellar:${user.address}`;
    try {
      return await this.credentialService.revokeCredential(id, callerDID);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('not found')) throw new NotFoundException(msg);
      if (msg.includes('Only the issuer')) throw new ForbiddenException(msg);
      if (msg.includes('already revoked')) throw new BadRequestException(msg);
      throw err;
    }
  }
}

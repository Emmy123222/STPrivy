import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl, IsDateString } from 'class-validator';
import { ProofService } from './proof.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ProofRequestStatus } from '@prisma/client';

const CIRCUIT_IDS = ['age-proof', 'residency-proof', 'accredited-investor', 'sanctions-check'] as const;

class GenerateProofDto {
  @IsString() @IsNotEmpty()
  credentialId!: string;

  @IsEnum(CIRCUIT_IDS)
  circuitId!: typeof CIRCUIT_IDS[number];
}

class VerifyProofDto {
  @IsString() @IsNotEmpty()
  proofId!: string;
}

class CreateProofRequestDto {
  @IsEnum(CIRCUIT_IDS)
  circuitId!: typeof CIRCUIT_IDS[number];

  @IsString() @IsNotEmpty()
  purpose!: string;

  @IsOptional() @IsUrl()
  callbackUrl?: string;

  @IsDateString()
  expiresAt!: string;
}

class RespondToRequestDto {
  @IsString() @IsNotEmpty()
  proofId!: string;

  @IsEnum(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';
}

@Controller('proofs')
export class ProofController {
  constructor(
    private readonly proofService: ProofService,
    private readonly prisma: PrismaService,
  ) {}

  /** GET /proofs — authenticated user's proofs */
  @Get()
  @UseGuards(JwtAuthGuard)
  async myProofs(@CurrentUser() user: AuthenticatedUser) {
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    if (!did) return [];
    return this.proofService.listBySubject(did.id);
  }

  /** GET /proofs/verifications — verifications made by this user (must come before :id) */
  @Get('verifications')
  @UseGuards(JwtAuthGuard)
  async myVerifications(@CurrentUser() user: AuthenticatedUser) {
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    if (!did) return [];
    return this.proofService.listVerifications(did.id);
  }

  /** GET /proofs/requests/pending — proof requests sent to this user's DID */
  @Get('requests/pending')
  @UseGuards(JwtAuthGuard)
  async pendingRequests(@CurrentUser() user: AuthenticatedUser) {
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    if (!did) return [];
    const now = new Date();
    // Return requests targeted at this DID, plus undirected (open) requests
    return this.prisma.proofRequest.findMany({
      where: {
        status: ProofRequestStatus.PENDING,
        expiresAt: { gt: now },
        OR: [{ subjectDID: did.id }, { subjectDID: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** GET /proofs/requests/:id — single proof request (public for deep-link sharing) */
  @Get('requests/:id')
  async getRequest(@Param('id') id: string) {
    const req = await this.prisma.proofRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Proof request not found');
    return req;
  }

  /** POST /proofs/requests — verifier creates a proof request */
  @Post('requests')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProofRequestDto,
  ) {
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    if (!did) throw new BadRequestException('Create your DID first via POST /did/create');

    return this.prisma.proofRequest.create({
      data: {
        verifierDID: did.id,
        circuitId: dto.circuitId,
        purpose: dto.purpose,
        callbackUrl: dto.callbackUrl,
        expiresAt: new Date(dto.expiresAt),
      },
    });
  }

  /** POST /proofs/requests/:id/respond — subject approves or rejects */
  @Post('requests/:id/respond')
  @UseGuards(JwtAuthGuard)
  async respondToRequest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondToRequestDto,
  ) {
    const req = await this.prisma.proofRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Proof request not found');
    if (req.status !== ProofRequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${req.status}`);
    }
    if (new Date() > req.expiresAt) {
      await this.prisma.proofRequest.update({ where: { id }, data: { status: ProofRequestStatus.EXPIRED } });
      throw new BadRequestException('Proof request has expired');
    }

    if (dto.decision === 'APPROVED') {
      // Validate the proof belongs to this user and is completed
      const proof = await this.prisma.zKProof.findUnique({ where: { id: dto.proofId } });
      const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
      if (!proof || !did || proof.subjectDID !== did.id) {
        throw new ForbiddenException('Proof does not belong to you');
      }
      if (proof.status !== 'COMPLETED') {
        throw new BadRequestException('Proof is not ready');
      }
      if (proof.circuitId !== req.circuitId) {
        throw new BadRequestException(`Proof circuit (${proof.circuitId}) does not match request (${req.circuitId})`);
      }

      return this.prisma.proofRequest.update({
        where: { id },
        data: { status: ProofRequestStatus.APPROVED, proofId: dto.proofId, subjectDID: did.id },
      });
    }

    return this.prisma.proofRequest.update({
      where: { id },
      data: { status: ProofRequestStatus.REJECTED },
    });
  }

  /** GET /proofs/:id — single proof detail (must belong to user) */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    const proof = await this.prisma.zKProof.findUnique({ where: { id } });
    if (!proof) throw new NotFoundException('Proof not found');
    if (!did || proof.subjectDID !== did.id) throw new ForbiddenException();
    return proof;
  }

  /** POST /proofs/generate — start ZK proof generation for a credential */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateProofDto,
  ) {
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    if (!did) throw new BadRequestException('Create your DID first via POST /did/create');
    return this.proofService.generateProof(did.id, dto.credentialId, dto.circuitId);
  }

  /** POST /proofs/verify — verify a completed proof */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyProofDto,
  ) {
    const did = await this.prisma.dID.findUnique({ where: { userId: user.userId } });
    if (!did) throw new BadRequestException('Create your DID first via POST /did/create');
    return this.proofService.verifyProof(dto.proofId, did.id);
  }
}

import { Controller, Get, Patch, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { IssuerService } from './issuer.service';

@Controller('issuers')
export class IssuerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly issuerService: IssuerService,
  ) {}

  /** GET /issuers — list all registered issuers */
  @Get()
  @UseGuards(JwtAuthGuard)
  async list() {
    const issuers = await this.prisma.issuer.findMany({
      orderBy: { registeredAt: 'desc' },
      include: { _count: { select: { credentials: true } } },
    });
    return issuers.map((i) => ({
      id: i.id,
      did: i.did,
      stellarAddress: i.stellarAddress,
      name: i.name,
      createdAt: i.registeredAt.toISOString(),
      active: i.active,
      onChainTxHash: i.onChainTxHash,
      credentialCount: i._count.credentials,
    }));
  }

  /** PATCH /issuers/:id/deactivate — deactivate an issuer in DB and on-chain */
  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivate(@Param('id') id: string) {
    const issuer = await this.prisma.issuer.findUnique({ where: { id } });
    if (!issuer) throw new NotFoundException('Issuer not found');

    const updated = await this.prisma.issuer.update({
      where: { id },
      data: { active: false },
    });

    // Best-effort: deactivate on-chain (fire-and-forget)
    this.issuerService.removeIssuer(issuer.stellarAddress).catch(() => {});

    return updated;
  }
}

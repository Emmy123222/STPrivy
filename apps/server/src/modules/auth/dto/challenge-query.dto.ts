import { IsString, Matches } from 'class-validator';

export class ChallengeQueryDto {
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'address must be a valid Stellar public key' })
  address: string;
}

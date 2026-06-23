import { IsString, Matches, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'address must be a valid Stellar public key' })
  address: string;

  @IsString()
  @IsNotEmpty()
  nonce: string;

  @IsString()
  @IsNotEmpty()
  signedXdr: string; // signed Stellar transaction XDR returned by the wallet
}

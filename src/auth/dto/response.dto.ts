import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsString } from 'class-validator';

export class TokenResDto {
  constructor(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
  @ApiProperty()
  @IsString()
  accessToken: string;

  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class AppGuestLoginResDto extends TokenResDto {
  constructor(accessToken: string, refreshToken: string, isNewUser: boolean, providerId: string) {
    super(accessToken, refreshToken);
    this.isNewUser = isNewUser;
    this.providerId = providerId;
  }
  @ApiProperty()
  @Expose()
  @IsBoolean()
  isNewUser: boolean;

  @ApiProperty()
  @Expose()
  @IsBoolean()
  providerId: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsString } from 'class-validator';
import { UserResDto } from 'src/user/dto/user.response.dto';

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

export class LoginResDto extends TokenResDto {
  @ApiProperty()
  @Expose()
  @Type(() => UserResDto)
  user: UserResDto;
}

export class WebGoogleLoginResDto extends LoginResDto {}

export class AppGoogleLoginResDto extends LoginResDto {}

export class AppGuestLoginResDto extends LoginResDto {
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

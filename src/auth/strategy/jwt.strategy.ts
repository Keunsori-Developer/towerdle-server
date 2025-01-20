import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUserPayload } from 'src/common/decorator/jwt-payload.decorator';
import { JwtTokenType } from '../enum/jwt-token-type.enum';
import { UserService } from 'src/user/user.service';
import { InvalidUserException } from 'src/common/exception/invalid.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('app.jwtSecret'),
    });
  }

  async validate(payload: any): Promise<JwtUserPayload> {
    const { id } = payload;
    if (payload.tkn !== JwtTokenType.ACCESS) {
      throw new UnauthorizedException('유효하지 않은 토큰');
    }

    const user = await this.userService.findOneById(id);

    if (!user) {
      throw new InvalidUserException();
    }

    return user;
  }
}

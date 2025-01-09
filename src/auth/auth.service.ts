import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { OAuth2Client } from 'google-auth-library';
import { InvalidUserException } from 'src/common/exception/invalid.exception';
import { GoogleUser } from 'src/common/interface/provider-user.interface';
import { Token } from 'src/entity/token.entity';
import { User } from 'src/entity/user.entity';
import { UserResDto } from 'src/user/dto/user.response.dto';
import { UserProvider } from 'src/user/enum/user-provider.enum';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';
import { AppGuestLoginReqDto } from './dto/request.dto';
import { AppGoogleLoginResDto, AppGuestLoginResDto, LoginResDto, WebGoogleLoginResDto } from './dto/response.dto';
import { JwtTokenType } from './enum/jwt-token-type.enum';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn = '30m';
  private readonly refreshTokenExpiresIn = '30d';
  private client: OAuth2Client;
  private readonly CLIENT_ID = this.configService.get('app.googleOauthClientId');
  private readonly CLIENT_SECRET = this.configService.get('app.googleOauthClientSecret');
  private readonly CLIENT_REDIRECT = this.configService.get('app.googleOauthRedirectUri');

  constructor(
    @InjectRepository(Token) private readonly tokenRepository: Repository<Token>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    this.client = new OAuth2Client({
      clientId: this.CLIENT_ID,
      clientSecret: this.CLIENT_SECRET,
      redirectUri: this.CLIENT_REDIRECT,
    });
  }

  async validateGoogleUser(googleUser: GoogleUser): Promise<any> {
    const { provider, providerId } = googleUser;
    const user = await this.userService.findOneByProviderId(provider, providerId);

    if (user) {
      return user;
    } else {
      const newUser = await this.userService.createGoogleUser(googleUser);
      return newUser;
    }
  }

  async googleLoginCallback(payload) {
    const { id } = payload;

    const user = await this.userService.findOneById(id);

    if (!user) {
      throw new BadRequestException('Invalid User');
    }

    // 토큰 발급 및 저장
    const { newAccessToken, newRefreshToken } = await this.generateBothTokens(user);
    await this.tokenRepository.save(this.tokenRepository.create({ refreshToken: newRefreshToken }));

    // response dto
    const userDto = plainToInstance(UserResDto, user, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
    const resDto = new WebGoogleLoginResDto(newAccessToken, newRefreshToken);
    resDto.user = userDto;

    return resDto;
  }

  async appGoogleLogin(idToken: string): Promise<AppGoogleLoginResDto> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: idToken,
        audience: this.CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new BadRequestException('Invalid token');
      }

      const googleUser: GoogleUser = {
        email: payload['email'],
        name: payload['name'],
        provider: UserProvider.GOOGLE,
        providerId: payload['sub'],
      };

      let user = await this.userService.findOneByProviderId(UserProvider.GOOGLE, googleUser.providerId);

      if (!user) {
        user = await this.userService.createGoogleUser(googleUser);
      }

      const { newAccessToken, newRefreshToken } = await this.generateBothTokens(user);
      await this.tokenRepository.save(this.tokenRepository.create({ refreshToken: newRefreshToken }));

      // response dto
      const userDto = plainToInstance(UserResDto, user, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
      const resDto = new AppGoogleLoginResDto(newAccessToken, newRefreshToken);
      resDto.user = userDto;

      return resDto;
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async appGuestLogin(dto: AppGuestLoginReqDto) {
    const { guestId } = dto;

    let user: User = null;
    let isNewUser: boolean = true;
    // 게스트 로그인
    if (guestId) {
      isNewUser = false;
      user = await this.userService.findOneByProviderId(UserProvider.GUEST, guestId);

      // 게스트 로그인인데 만약 없는 유저
      if (!user) throw new InvalidUserException();
    }

    // 게스트 회원가입
    else {
      user = await this.userService.createGuestUser();
    }

    const { newAccessToken, newRefreshToken } = await this.generateBothTokens(user);
    await this.tokenRepository.save(this.tokenRepository.create({ refreshToken: newRefreshToken }));

    // response dto
    const userDto = plainToInstance(UserResDto, user, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
    const resDto = new AppGuestLoginResDto(newAccessToken, newRefreshToken, isNewUser, user.providerId);
    resDto.user = userDto;

    return resDto;
  }

  async refresh(token: string): Promise<LoginResDto> {
    const prevRefreshToken = await this.tokenRepository.findOne({ where: { refreshToken: token } });
    if (!prevRefreshToken) {
      throw new BadRequestException('Invalid refreshtoken');
    }

    const { id } = this.jwtService.verify(token);

    const user = await this.userService.findOneById(id);

    if (!user) {
      throw new InvalidUserException();
    }

    const userDto = plainToInstance(UserResDto, user, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    const { newAccessToken, newRefreshToken } = await this.generateBothTokens(user);
    await this.tokenRepository.save(this.tokenRepository.create({ refreshToken: newRefreshToken }));

    const resDto = new LoginResDto(newAccessToken, newRefreshToken);
    resDto.user = userDto;

    return resDto;
  }

  async logout(token: string) {
    await this.tokenRepository.delete({ refreshToken: token });
  }

  private generateAccessToken(id: string) {
    const payload = { id: id, tkn: JwtTokenType.ACCESS };
    const options = { expiresIn: this.accessTokenExpiresIn, secret: this.configService.get('app.jwtSecret') };

    return this.jwtService.sign(payload, options);
  }

  private generateRefreshToken(id: string) {
    const payload = { id: id, tkn: JwtTokenType.REFRESH };
    const options = { expiresIn: this.refreshTokenExpiresIn, secret: this.configService.get('app.jwtSecret') };

    return this.jwtService.sign(payload, options);
  }

  private async generateBothTokens(user: User) {
    const newAccessToken = this.generateAccessToken(user.id);
    const newRefreshToken = this.generateRefreshToken(user.id);

    return { newAccessToken, newRefreshToken };
  }
}

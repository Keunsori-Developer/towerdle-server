import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { GoogleUser } from 'src/common/interface/provider-user.interface';
import { Token } from 'src/entity/token.entity';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';
import { AppGuestLoginResDto, TokenResDto } from './dto/response.dto';
import { JwtPayLoad } from 'src/common/decorator/jwt-payload.decorator';
import { JwtTokenType } from './enum/jwt-token-type.enum';
import { User } from 'src/entity/user.entity';
import { OAuth2Client } from 'google-auth-library';
import { UserProvider } from 'src/user/enum/user-provider.enum';
import { AppGuestLoginReqDto } from './dto/request.dto';
import { InvalidUserException } from 'src/common/exception/invalid.exception';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn = '30m';
  private readonly refreshTokenExpiresIn = '30d';
  private client: OAuth2Client;
  private readonly CLIENT_ID = this.configService.get('app.googleOauthClientId');
  // private readonly CLIENT_ID = '502833253886-4k6q291k6cg8f7akujj7k360t4fabcra.apps.googleusercontent.com'; //내꺼
  // '236075874307-3i9rfec1lujamn3dih8g36sv5fi4f1vt.apps.googleusercontent.com'//대경

  constructor(
    @InjectRepository(Token) private readonly tokenRepository: Repository<Token>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    this.client = new OAuth2Client(this.CLIENT_ID);
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

  async loginCallback(payload: User): Promise<TokenResDto> {
    const { id } = payload;

    const newAccessToken = this.generateAccessToken(id);
    const newRefreshToken = this.generateRefreshToken(id);

    const refreshTokenEntity = this.tokenRepository.create({ refreshToken: newRefreshToken });
    await this.tokenRepository.save(refreshTokenEntity);

    const resDto = new TokenResDto(newAccessToken, newRefreshToken);

    return resDto;
  }

  async refresh(token: string): Promise<TokenResDto> {
    const prevRefreshToken = await this.tokenRepository.findOne({ where: { refreshToken: token } });
    if (!prevRefreshToken) {
      throw new BadRequestException('Invalid refreshtoken');
    }

    const { id } = this.jwtService.verify(token);

    const user = await this.userService.fineOneById(id);

    if (!user) {
      throw new BadRequestException('Invalid User');
    }

    const newAccessToken = this.generateAccessToken(id);
    const newRefreshToken = this.generateRefreshToken(id);

    prevRefreshToken.refreshToken = newRefreshToken;
    await this.tokenRepository.save(prevRefreshToken);

    const resDto = new TokenResDto(newAccessToken, newRefreshToken);

    return resDto;
  }

  async refreshTEST(): Promise<TokenResDto> {
    const id = '1';
    const user = await this.userService.fineOneById(id);

    if (!user) {
      throw new BadRequestException('Invalid User');
    }

    const newAccessToken = this.generateAccessToken(id);
    const newRefreshToken = this.generateRefreshToken(id);

    await this.tokenRepository.save({ refreshToken: newRefreshToken });

    const resDto = new TokenResDto(newAccessToken, newRefreshToken);

    return resDto;
  }

  async logout(token: string) {
    await this.tokenRepository.delete({ refreshToken: token });
  }

  async appGoogleLogin(idToken: string) {
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
      console.log('🚀 ~ AuthService ~ appLogin ~ googleUser:', googleUser);

      let user = await this.userService.findOneByProviderId(UserProvider.GOOGLE, googleUser.providerId);

      if (!user) {
        user = await this.userService.createGoogleUser(googleUser);
      }

      const newAccessToken = this.generateAccessToken(user.id);
      const newRefreshToken = this.generateRefreshToken(user.id);

      const refreshTokenEntity = this.tokenRepository.create({ refreshToken: newRefreshToken });
      await this.tokenRepository.save(refreshTokenEntity);

      const resDto = new TokenResDto(newAccessToken, newRefreshToken);

      return resDto;
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Invalid Token');
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

    const newAccessToken = this.generateAccessToken(user.id);
    const newRefreshToken = this.generateRefreshToken(user.id);

    const refreshTokenEntity = this.tokenRepository.create({ refreshToken: newRefreshToken });
    await this.tokenRepository.save(refreshTokenEntity);

    const resDto = new AppGuestLoginResDto(newAccessToken, newRefreshToken, isNewUser, user.providerId);
    return resDto;
  }

  private generateAccessToken(id: string) {
    const payload: JwtPayLoad = { id: id, tkn: JwtTokenType.ACCESS };
    const options = { expiresIn: this.accessTokenExpiresIn, secret: this.configService.get('app.jwtSecret') };

    return this.jwtService.sign(payload, options);
  }

  private generateRefreshToken(id: string) {
    const payload: JwtPayLoad = { id: id, tkn: JwtTokenType.REFRESH };
    const options = { expiresIn: this.refreshTokenExpiresIn, secret: this.configService.get('app.jwtSecret') };

    return this.jwtService.sign(payload, options);
  }
}

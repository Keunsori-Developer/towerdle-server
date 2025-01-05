import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponse } from 'src/common/decorator/error-response.decorator';
import { Jwt, JwtPayLoad } from 'src/common/decorator/jwt-payload.decorator';
import { CustomExceptionCode } from 'src/common/enum/custom-exception-code.enum';
import { CustomErrorDefinitions } from 'src/common/exception/error-definitions';
import { QuizService } from 'src/quiz/quiz.service';
import { UserDetailResDto } from './dto/user.response.dto';
import { UserService } from './user.service';

@ApiTags('User')
@ApiBearerAuth()
@ApiErrorResponse([
  CustomErrorDefinitions[CustomExceptionCode.INVALID_JWT],
  CustomErrorDefinitions[CustomExceptionCode.EXPIRED_JWT],
])
@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly quizService: QuizService,
  ) {}

  @ApiOperation({ summary: '유저 정보 반환' })
  @ApiResponse({ status: HttpStatus.OK, type: UserDetailResDto })
  @ApiErrorResponse([CustomErrorDefinitions[CustomExceptionCode.INVALID_USER]])
  @Get('')
  @HttpCode(HttpStatus.OK)
  async getMyUserData(@Jwt() JwtPayload: JwtPayLoad) {
    const { user, solveData } = await this.userService.getMyUserData(JwtPayload.id);
    return UserDetailResDto.toDto(user, solveData);
  }

  @ApiOperation({ summary: '퀴즈 풀이 통계 조회' })
  @Get('stat')
  async getQuizStat(@Jwt() JwtPayload: JwtPayLoad) {
    return this.quizService.getQuizStats(JwtPayload.id);
  }
}

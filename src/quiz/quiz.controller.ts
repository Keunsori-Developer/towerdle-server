import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponse } from 'src/common/decorator/error-response.decorator';
import { Jwt, JwtPayLoad } from 'src/common/decorator/jwt-payload.decorator';
import { ApiPostResponse } from 'src/common/decorator/swagger.decorator';
import { CustomExceptionCode } from 'src/common/enum/custom-exception-code.enum';
import { CustomErrorDefinitions } from 'src/common/exception/error-definitions';
import { QuizAttemptReqDto, QuizStartReqDto } from './dto/quiz.request.dto';
import { QuizResDto, QuizSolveResDto } from './dto/quiz.response.dto';
import { QuizDifficulty } from './enum/quiz.enum';
import { DIFFICULTY_MAP } from './interface/quiz-difficulty.interface';
import { QuizService } from './quiz.service';

@ApiTags('Quiz')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @ApiOperation({
    summary: '새 단어퀴즈 요청',
    description: `
    ${QuizDifficulty.EASY} :      ${DIFFICULTY_MAP[QuizDifficulty.EASY].lengthMin}~${DIFFICULTY_MAP[QuizDifficulty.EASY].lengthMax}글자, ${DIFFICULTY_MAP[QuizDifficulty.EASY].countMin}~${DIFFICULTY_MAP[QuizDifficulty.EASY].countMax}개 자모음, 복합자모음 없음, 최대 ${DIFFICULTY_MAP[QuizDifficulty.EASY].maxAttempts}번 시도\n
    ${QuizDifficulty.MEDIUM} :    ${DIFFICULTY_MAP[QuizDifficulty.MEDIUM].lengthMin}~${DIFFICULTY_MAP[QuizDifficulty.MEDIUM].lengthMax}글자, ${DIFFICULTY_MAP[QuizDifficulty.MEDIUM].countMin}~${DIFFICULTY_MAP[QuizDifficulty.MEDIUM].countMax}개 자모음, 복합자모음 랜덤, 최대 ${DIFFICULTY_MAP[QuizDifficulty.MEDIUM].maxAttempts}번 시도\n
    ${QuizDifficulty.HARD} :      ${DIFFICULTY_MAP[QuizDifficulty.HARD].lengthMin}~${DIFFICULTY_MAP[QuizDifficulty.HARD].lengthMax}글자, ${DIFFICULTY_MAP[QuizDifficulty.HARD].countMin}~${DIFFICULTY_MAP[QuizDifficulty.HARD].countMax}개 자모음, 복합자모음 랜덤, 최대 ${DIFFICULTY_MAP[QuizDifficulty.HARD].maxAttempts}번 시도\n
    ${QuizDifficulty.VERYHARD} :  ${DIFFICULTY_MAP[QuizDifficulty.VERYHARD].lengthMin}~${DIFFICULTY_MAP[QuizDifficulty.VERYHARD].lengthMax}글자, ${DIFFICULTY_MAP[QuizDifficulty.VERYHARD].countMin}~${DIFFICULTY_MAP[QuizDifficulty.VERYHARD].countMax}개 자모음, 복합자모음 랜덤, 최대 ${DIFFICULTY_MAP[QuizDifficulty.VERYHARD].maxAttempts}번 시도
    `,
  })
  @ApiPostResponse(QuizResDto)
  @ApiErrorResponse([CustomErrorDefinitions[CustomExceptionCode.NOTFOUND_WORD]])
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async startNewQuiz(@Jwt() JwtPayload: JwtPayLoad, @Body() dto: QuizStartReqDto) {
    const { quiz, difficultyConfig } = await this.quizService.startNewQuiz(JwtPayload.id, dto);

    return QuizResDto.toDto(quiz, difficultyConfig);
  }

  @ApiOperation({ summary: '퀴즈 풀이 결과 저장' })
  @ApiParam({ name: 'uuid', description: '퀴즈 UUID', type: String })
  @ApiErrorResponse([
    CustomErrorDefinitions[CustomExceptionCode.INVALID_QUIZ],
    CustomErrorDefinitions[CustomExceptionCode.FINISHED_QUIZ],
  ])
  @ApiPostResponse(QuizSolveResDto)
  @Post(':uuid')
  @HttpCode(HttpStatus.CREATED)
  async solveQuiz(@Jwt() JwtPayload: JwtPayLoad, @Param('uuid') uuid: string, @Body() dto: QuizAttemptReqDto) {
    const result = await this.quizService.solveQuiz(JwtPayload.id, uuid, dto);
    return QuizSolveResDto.toDto(result);
  }
}

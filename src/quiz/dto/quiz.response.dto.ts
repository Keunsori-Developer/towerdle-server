import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Type } from 'class-transformer';
import { Quiz } from 'src/entity/quiz.entity';
import { QuizStatus } from '../enum/quiz.enum';
import { QuizDifficultyStats } from '../interface/quiz.interface';

class QuizWordResDto {
  @ApiProperty()
  @Expose()
  value: string;

  @ApiProperty()
  @Expose()
  definitions: string;

  @ApiProperty()
  @Expose()
  length: number;

  @ApiProperty()
  @Expose()
  count: number;
}

class QuizDifficultyResDto {
  @ApiProperty()
  @Expose()
  lengthMin: number;

  @ApiProperty()
  @Expose()
  lengthMax: number;

  @ApiProperty()
  @Expose()
  countMin: number;

  @ApiProperty()
  @Expose()
  countMax: number;

  @ApiProperty()
  @Expose()
  complexVowel: boolean;

  @ApiProperty()
  @Expose()
  complexConsonant: boolean;

  @ApiProperty()
  @Expose()
  maxAttempts: number;
}

export class QuizResDto {
  @ApiProperty()
  @Expose()
  uuid: string;

  @ApiProperty()
  @Expose()
  @Type(() => QuizWordResDto)
  word: QuizWordResDto;

  @ApiProperty()
  @Expose()
  @Type(() => QuizDifficultyResDto)
  difficulty: QuizDifficultyResDto;

  static toDto(quiz: Quiz, difficultyConfig: any): QuizResDto {
    const resDto = plainToInstance(QuizResDto, quiz, { excludeExtraneousValues: true });
    const difficultyResDto = plainToInstance(QuizDifficultyResDto, difficultyConfig, {
      excludeExtraneousValues: true,
    });

    resDto.difficulty = difficultyResDto;
    return resDto;
  }
}

export class QuizSolveResDto {
  @ApiProperty()
  @Expose()
  status: QuizStatus;

  @ApiProperty()
  @Expose()
  attempts: number;

  static toDto(quiz: Quiz): QuizSolveResDto {
    const resDto = plainToInstance(QuizSolveResDto, quiz, { excludeExtraneousValues: true });
    return resDto;
  }
}

export class QuizStatsResDto {
  @ApiProperty({ example: 2, type: 'number' })
  @Expose()
  solveCount: number;

  @ApiProperty({ example: '2025. 1. 1. 오후 12:00:00' })
  @Expose()
  lastSolve: string;

  @ApiProperty({ example: 1 })
  @Expose()
  solveStreak: number;

  @ApiProperty({ example: { EASY: { totalSolved: 3, averageAttempts: 3.2, attemptCounts: { 1: 1, 2: 3, 3: 5 } } } })
  @Expose()
  details: QuizDifficultyStats;
}

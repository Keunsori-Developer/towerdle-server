import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Type } from 'class-transformer';
import { User } from 'src/entity/user.entity';
import { QuizStatsResDto } from 'src/quiz/dto/quiz.response.dto';

export class UserResDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  name: string;
}

export class UserDetailResDto extends UserResDto {
  @ApiProperty()
  @Expose()
  @Type(() => QuizStatsResDto)
  quizStats: QuizStatsResDto;

  static toDto(user: User, solveData: any) {
    const resDto = plainToInstance(UserDetailResDto, user, { excludeExtraneousValues: true });
    resDto.quizStats = plainToInstance(QuizStatsResDto, solveData, { excludeExtraneousValues: true });
    return resDto;
  }
}

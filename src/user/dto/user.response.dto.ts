import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Type } from 'class-transformer';
import { User } from 'src/entity/user.entity';

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

export class UserQuizResDto {
  @ApiProperty({ example: 2, type: 'number' })
  @Expose()
  solveCount: number;

  @ApiProperty({ example: '2024. 8. 1. 오전 11:00:00' })
  @Expose()
  lastSolve: string;

  @ApiProperty({ example: 1 })
  @Expose()
  solveStreak: number;
}

export class UserDetailResDto extends UserResDto {
  @ApiProperty()
  @Expose()
  @Type(() => UserQuizResDto)
  solveData: UserQuizResDto;

  static toDto(user: User, solveData: any) {
    const resDto = plainToInstance(UserDetailResDto, user, { excludeExtraneousValues: true });
    resDto.solveData = plainToInstance(UserQuizResDto, solveData, { excludeExtraneousValues: true });
    return resDto;
  }
}

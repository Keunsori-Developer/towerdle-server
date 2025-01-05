import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { QuizModule } from 'src/quiz/quiz.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), QuizModule],
  exports: [UserService],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}

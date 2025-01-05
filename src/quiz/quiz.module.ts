import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from 'src/entity/quiz.entity';
import { WordModule } from 'src/word/word.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz]), WordModule],
  providers: [QuizService],
  controllers: [QuizController],
  exports: [QuizService],
})
export class QuizModule {}

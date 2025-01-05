import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Word } from 'src/entity/word.entity';
import { WordController } from './word.controller';
import { WordService } from './word.service';

@Module({
  imports: [TypeOrmModule.forFeature([Word])],
  exports: [WordService],
  controllers: [WordController],
  providers: [WordService],
})
export class WordModule {}

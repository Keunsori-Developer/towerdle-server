import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ApiErrorResponse } from 'src/common/decorator/error-response.decorator';
import { ApiGetResponse } from 'src/common/decorator/swagger.decorator';
import { CustomExceptionCode } from 'src/common/enum/custom-exception-code.enum';
import { CustomErrorDefinitions } from 'src/common/exception/error-definitions';
import { AddWordReqDto, GetWordReqDto as WordReqDto } from './dto/request.dto';
import { WordResDto } from './dto/response.dto';
import { WordService } from './word.service';

@ApiTags('Word')
@Controller('word')
export class WordController {
  constructor(private wordService: WordService) {}

  @ApiOperation({ summary: '랜덤한 단어 한개 반환', deprecated: true })
  @ApiGetResponse(WordResDto)
  @ApiErrorResponse([CustomErrorDefinitions[CustomExceptionCode.NOTFOUND_WORD]])
  @Get()
  @HttpCode(HttpStatus.OK)
  async getWord(@Query() dto: WordReqDto) {
    return await this.wordService.getRandomWord(dto);
  }

  @ApiOperation({
    summary: '단어 정보 확인',
    description:
      '정상적인 단어이고 만약 db에 없는 단어라면 db에 자동으로 추가함 </br> <b>ㅊㅏㅁㅇㅗㅣ</b> -> 자동으로 <b>참외</b> 로 조회 후 추가함.',
  })
  @ApiParam({ name: 'value' })
  @ApiErrorResponse([CustomErrorDefinitions[CustomExceptionCode.INVALID_WORD]])
  @Get(':value')
  @HttpCode(HttpStatus.OK)
  async getWordInfo(@Param('value') value: string) {
    const res = await this.wordService.getWordInfo(value);
    return plainToInstance(WordResDto, res, { excludeExtraneousValues: true });
  }

  @ApiOperation({ summary: 'db에 단어 추가', deprecated: true })
  @ApiBody({ type: AddWordReqDto })
  @Post('')
  @HttpCode(HttpStatus.OK)
  async addWords(@Body() dto: AddWordReqDto) {
    return await this.wordService.addWordsIntoDatabase(dto.words);
  }
}

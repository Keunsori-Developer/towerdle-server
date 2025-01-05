import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc';
import hangul from 'hangul-js';
import { FINALS, INITIALS, MEDIALS } from 'src/common/constant/hangul.constant';
import { InvalidWordException } from 'src/common/exception/invalid.exception';
import { NotFoundWordException } from 'src/common/exception/notfound.exception';
import { Word } from 'src/entity/word.entity';
import { QuizDifficulty, QuizStatus } from 'src/quiz/enum/quiz.enum';
import { DIFFICULTY_MAP } from 'src/quiz/interface/quiz-difficulty.interface';
import { DeepPartial, Repository } from 'typeorm';
import { GetWordReqDto } from './dto/request.dto';
import { WordResDto } from './dto/response.dto';
import { mapJsonToStructuredData, parseXmlToJson, transformAndExtractDefinitions } from './mapper/word.mapper';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');
@Injectable()
export class WordService {
  constructor(
    @InjectRepository(Word) private wordRepository: Repository<Word>,
    private readonly configService: ConfigService,
  ) {}

  async getRandomWord(dto: GetWordReqDto): Promise<WordResDto> {
    const randomWordQueryBuilder = this.wordRepository.createQueryBuilder();

    if (dto.length) {
      randomWordQueryBuilder.andWhere('length = :length', { length: dto.length });
    }

    if (dto.count) {
      randomWordQueryBuilder.andWhere('count = :count', { count: dto.count });
    }

    if (dto.complexVowel !== undefined) {
      randomWordQueryBuilder.andWhere('has_complex_vowel = :complexVowel', { complexVowel: dto.complexVowel });
    }

    if (dto.complexConsonant !== undefined) {
      randomWordQueryBuilder.andWhere('has_complex_consonant = :complexConsonant', {
        complexConsonant: dto.complexConsonant,
      });
    }

    randomWordQueryBuilder.orderBy('RANDOM()').limit(1);

    const randomWord = await randomWordQueryBuilder.getOne();

    if (!randomWord) {
      throw new NotFoundWordException();
    }

    //TODO: null일때 리턴 이후에 db update 실행
    if (!randomWord.definitions || randomWord.length == 0) {
      const { success, definitions } = await this.checkAndgetWordDefinitionsFromKrDictApi(randomWord.value);

      if (!success) {
        throw new InvalidWordException();
      }

      randomWord.definitions = definitions;

      await this.wordRepository.save(randomWord);
    }

    const resDto = plainToInstance(WordResDto, randomWord, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    return resDto;
  }

  async getRandomWordForQuiz(userId: string, difficulty: QuizDifficulty) {
    const { lengthMin, lengthMax, countMin, countMax, complexVowel, complexConsonant } = DIFFICULTY_MAP[difficulty] || {
      lengthMin: 2,
      lengthMax: 3,
      countMin: 4,
      countMax: 6,
      complexVowel: false,
      complexConsonant: false,
      maxAttempts: 6,
    };

    const randomWordQueryBuilder = this.wordRepository.createQueryBuilder('word');

    // 이미 풀었고 맞춘 단어들 제외
    randomWordQueryBuilder.where(
      `word.id NOT IN (
        SELECT quiz.word_id 
        FROM quiz 
        WHERE quiz.user_id = :userId 
        AND quiz.status = :status
      )`,
      { userId, status: QuizStatus.SOLVED },
    );

    if (lengthMin !== undefined && lengthMax !== undefined) {
      randomWordQueryBuilder.andWhere('word.length BETWEEN :lengthMin AND :lengthMax', {
        lengthMin,
        lengthMax,
      });
    }

    if (countMin !== undefined && countMax !== undefined) {
      randomWordQueryBuilder.andWhere('word.count BETWEEN :countMin AND :countMax', {
        countMin,
        countMax,
      });
    }

    if (complexVowel !== undefined) {
      randomWordQueryBuilder.andWhere('word.has_complex_vowel = :complexVowel', { complexVowel });
    }

    if (complexConsonant !== undefined) {
      randomWordQueryBuilder.andWhere('word.has_complex_consonant = :complexConsonant', {
        complexConsonant,
      });
    }

    randomWordQueryBuilder.orderBy('RANDOM()').limit(1);

    const randomWord = await randomWordQueryBuilder.getOne();

    if (!randomWord) {
      throw new NotFoundWordException();
    }

    if (!randomWord.definitions) {
      const { success, definitions } = await this.checkAndgetWordDefinitionsFromKrDictApi(randomWord.value);

      if (!success) {
        throw new InternalServerErrorException();
      }

      randomWord.definitions = definitions;
      await this.wordRepository.save(randomWord);
    }

    return randomWord;
  }

  async addWordsIntoDatabase(words: string) {
    const wordList = words
      .split(',')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    const wordEntities: DeepPartial<Word>[] = [];

    for (const word of wordList) {
      const existingWord = await this.wordRepository.findOne({ where: { value: word } });
      if (!existingWord) {
        const { success, definitions } = await this.checkAndgetWordDefinitionsFromKrDictApi(word);

        if (!success) {
          continue;
        }

        const { length, count, complexConsonantCount, complexVowelCount } = await this.checkWord(word);
        const hasComplexConsonant = complexConsonantCount > 0;
        const hasComplexVowel = complexVowelCount > 0;

        wordEntities.push(
          this.wordRepository.create({ value: word, length, count, hasComplexConsonant, hasComplexVowel, definitions }),
        );
      }
    }

    if (wordEntities.length > 0) {
      await this.wordRepository.save(wordEntities);
    }
  }

  async getWordInfo(word: string) {
    const transformedWord = hangul.assemble(word.split('')).trim();
    let existingWord = await this.wordRepository.findOne({ where: { value: transformedWord } });

    if (!existingWord) {
      const { success, definitions } = await this.checkAndgetWordDefinitionsFromKrDictApi(transformedWord);

      if (!success) {
        throw new InvalidWordException();
      }

      const { length, count, complexConsonantCount, complexVowelCount } = await this.checkWord(transformedWord);
      const hasComplexConsonant = complexConsonantCount > 0;
      const hasComplexVowel = complexVowelCount > 0;

      existingWord = await this.wordRepository.save({
        value: transformedWord,
        length,
        count,
        hasComplexConsonant,
        hasComplexVowel,
        definitions,
      });
    }

    return existingWord;
  }

  async checkWord(word: string) {
    const { arr, complexConsonantCount, complexVowelCount } = this.decomposeConstants(this.decomposeHangulString(word));
    const length = word.length;
    const count = arr.length;

    return { arr, length, count, complexConsonantCount, complexVowelCount };
  }

  /**
   * 한들버전
   * ㅃ,ㅉ,ㄸ,ㄲ,ㅆ,ㅒ,ㅖ는 한개로 처리, 복합 카운트 증가 시키지 않음.
   * ㅐ,ㅔ 등도 한개로 처리.
   */
  private decomposeConstants(arr: string[]) {
    let complexConsonantCount = 0;
    let complexVowelCount = 0;

    const decomposed = arr.flatMap((char) => {
      switch (char) {
        case 'ㄳ':
          complexConsonantCount++;
          return ['ㄱ', 'ㅅ'];
        case 'ㄵ':
          complexConsonantCount++;
          return ['ㄴ', 'ㅈ'];
        case 'ㄶ':
          complexConsonantCount++;
          return ['ㄴ', 'ㅎ'];
        case 'ㄺ':
          complexConsonantCount++;
          return ['ㄹ', 'ㄱ'];
        case 'ㄻ':
          complexConsonantCount++;
          return ['ㄹ', 'ㅁ'];
        case 'ㄼ':
          complexConsonantCount++;
          return ['ㄹ', 'ㅂ'];
        case 'ㄽ':
          complexConsonantCount++;
          return ['ㄹ', 'ㅅ'];
        case 'ㄾ':
          complexConsonantCount++;
          return ['ㄹ', 'ㅌ'];
        case 'ㄿ':
          complexConsonantCount++;
          return ['ㄹ', 'ㅍ'];
        case 'ㅀ':
          complexConsonantCount++;
          return ['ㄹ', 'ㅎ'];
        case 'ㅄ':
          complexConsonantCount++;
          return ['ㅂ', 'ㅅ'];
        case 'ㅘ':
          complexVowelCount++;
          return ['ㅗ', 'ㅏ'];
        case 'ㅙ':
          complexVowelCount++;
          return ['ㅗ', 'ㅐ'];
        case 'ㅚ':
          complexVowelCount++;
          return ['ㅗ', 'ㅣ'];
        case 'ㅝ':
          complexVowelCount++;
          return ['ㅜ', 'ㅓ'];
        case 'ㅞ':
          complexVowelCount++;
          return ['ㅜ', 'ㅔ'];
        case 'ㅟ':
          complexVowelCount++;
          return ['ㅜ', 'ㅣ'];
        case 'ㅢ':
          complexVowelCount++;
          return ['ㅡ', 'ㅣ'];
        default:
          return [char];
      }
    });
    return {
      arr: decomposed,
      complexConsonantCount,
      complexVowelCount,
    };
  }

  private decomposeHangulString(str: string): string[] {
    const result: string[] = [];

    for (const char of str) {
      const code = char.charCodeAt(0) - 0xac00;

      if (code < 0 || code > 11171) {
        result.push(char);
        continue;
      }

      const initialIndex = Math.floor(code / 588);
      const medialIndex = Math.floor((code % 588) / 28);
      const finalIndex = code % 28;

      result.push(INITIALS[initialIndex], MEDIALS[medialIndex]);
      if (FINALS[finalIndex]) result.push(FINALS[finalIndex]);
    }

    return result;
  }

  async checkAndgetWordDefinitionsFromKrDictApi(str: string) {
    const url = 'https://krdict.korean.go.kr/api/search';
    const params = {
      key: this.configService.get('app.krdictApiKey'),
      q: str,
      advanced: 'y',
      part: 'word',
      method: 'exact',
    };

    try {
      const response = await axios.get(url, { params });
      const xmlData = response.data;
      const jsonData = await parseXmlToJson(xmlData);
      const structuredData = mapJsonToStructuredData(jsonData);
      if (structuredData.total === 0) {
        throw new InvalidWordException('KrDict에서 해당 단어를 찾을 수 없습니다.');
      }

      const definitions = transformAndExtractDefinitions(structuredData);
      return { success: true, definitions: JSON.stringify(definitions) };
    } catch (error) {
      console.error('Error fetching or processing data:', error.message);
      return { success: false, definitions: null };
    }
  }
}

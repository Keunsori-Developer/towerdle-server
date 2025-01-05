import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FinishedQuizException,
  InvalidQuizException,
  InvalidUserException,
} from 'src/common/exception/invalid.exception';
import { Quiz } from 'src/entity/quiz.entity';
import { User } from 'src/entity/user.entity';
import { WordService } from 'src/word/word.service';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { QuizAttemptReqDto, QuizStartReqDto } from './dto/quiz.request.dto';
import { QuizStatus } from './enum/quiz.enum';
import { DIFFICULTY_MAP } from './interface/quiz-difficulty.interface';
import { QuizRawStats, QuizStats } from './interface/quiz.interface';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    private readonly wordService: WordService,
  ) {}

  async startNewQuiz(userId: string, dto: QuizStartReqDto) {
    const { difficulty } = dto;

    //TODO: user 검증을 메소드 밖으로 변경
    // const user = await this.userService.fineOneById(userId);

    // if (!user) {
    //   throw new InvalidUserException();
    // }

    const uuid = uuidv4();
    const randomWord = await this.wordService.getRandomWordForQuiz(userId, difficulty);

    const quiz = await this.quizRepository.save({
      uuid,
      word: randomWord,
      user: { id: userId },
      difficulty,
    });

    const difficultyConfig: any = DIFFICULTY_MAP[difficulty];
    return { quiz, difficultyConfig };
  }

  async solveQuiz(userId: string, uuid: string, dto: QuizAttemptReqDto) {
    const { attempts, solved } = dto;

    const quiz = await this.quizRepository.findOne({
      where: { uuid, user: { id: userId } },
      relations: { word: true },
    });

    if (!quiz) {
      throw new InvalidQuizException();
    }

    if (quiz.status !== QuizStatus.IN_PROGRESS) {
      throw new FinishedQuizException();
    }

    //TODO: 현재 난이도의 maxAttempts 를 초과하는 attempts 는 허용하지 않도록 수정
    quiz.attempts = attempts;
    quiz.status = solved ? QuizStatus.SOLVED : QuizStatus.FAILED;

    const updatedQuiz = await this.quizRepository.save(quiz);
    return updatedQuiz;
  }

  //TODO:
  // async getCurrentSolveStreak(userId: User['id']) {
  //   const solvedWords = await this.quizRepository.find({
  //     select: { createdAt: true },
  //     where: { user: { id: userId }, status: QuizStatus.SOLVED },
  //     order: { createdAt: 'DESC' }, // 날짜 순서대로 정렬
  //   });

  //   const solvedWordsInKoreaTime = solvedWords.map((word) => ({
  //     ...word,
  //     createdAt: dayjs(word.createdAt).tz().startOf('day'),
  //   }));

  //   const solveDateArray = [...new Set(solvedWordsInKoreaTime.map((word) => word.createdAt))];

  //   if (solveDateArray.length === 0) {
  //     return 0;
  //   }
  //   // 처음은 오늘부터 확인
  //   let targetDay = dayjs().startOf('day');
  //   let streak = 0;

  //   //오늘 풀었으면 1 추가
  //   if (dayjs(solveDateArray[0]).isSame(targetDay)) {
  //     streak = 1;
  //   }

  //   // 어제부터 이어서 확인
  //   targetDay = targetDay.subtract(1, 'day');

  //   for (let i = 0; i < solveDateArray.length; i++) {
  //     const solvedDate = dayjs(solveDateArray[i]);
  //     if (solvedDate.isSame(targetDay)) {
  //       targetDay = targetDay.subtract(1, 'day');
  //       streak += 1;
  //     } else {
  //       break;
  //     }
  //   }
  //   return streak;
  // }

  async getUserSolveData(user: User) {
    if (!user) {
      throw new InvalidUserException();
    }

    const solveCount =
      (await this.quizRepository.count({ where: { user: { id: user.id }, status: QuizStatus.SOLVED } })) ?? 0;

    const lastSolveRaw = await this.quizRepository.findOne({
      where: { user: { id: user.id }, status: QuizStatus.SOLVED },
      order: { id: 'desc' },
    });
    //TODO:
    // const solveStreak = await this.getCurrentSolveStreak(user.id);

    const lastSolve = lastSolveRaw?.createdAt.toLocaleString() ?? null;

    return { solveCount, lastSolve, solveStreak: 0 };
  }

  //TODO: dto 화
  async getQuizStats(userId: string) {
    // 난이도별 solved된 퀴즈들의 attempts 데이터를 가져옴

    const solvedQuizzes = await this.quizRepository.find({
      where: { user: { id: userId }, status: QuizStatus.SOLVED },
    });

    const result: Record<string, QuizRawStats> = {};

    for (const quiz of solvedQuizzes) {
      const { difficulty, attempts } = quiz;

      if (!result[difficulty]) {
        result[difficulty] = {
          totalSolved: 0,
          totalAttempts: 0,
          attemptCounts: {},
        };
      }

      result[difficulty].totalSolved++;
      result[difficulty].totalAttempts += attempts;

      if (!result[difficulty].attemptCounts[attempts]) {
        result[difficulty].attemptCounts[attempts] = 0;
      }

      result[difficulty].attemptCounts[attempts]++;
    }

    const formattedResult: QuizStats = {};
    for (const [difficulty, data] of Object.entries(result)) {
      formattedResult[difficulty] = {
        totalSolved: data.totalSolved,
        averageAttempts: data.totalSolved > 0 ? Number((data.totalAttempts / data.totalSolved).toFixed(1)) : 0,
        attemptCounts: data.attemptCounts,
      };
    }

    return formattedResult;
  }
}

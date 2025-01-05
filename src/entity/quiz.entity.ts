import { QuizDifficulty, QuizStatus } from 'src/quiz/enum/quiz.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Word } from './word.entity';

@Entity({ name: 'quiz' })
export class Quiz {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column({ name: 'uuid', type: 'varchar', length: 36 })
  uuid: string;

  @Column({ name: 'attempts', type: 'integer', nullable: true })
  attempts: number;

  @Column({ name: 'status', type: 'enum', enum: QuizStatus, default: QuizStatus.IN_PROGRESS })
  status: QuizStatus;

  @Column({ name: 'difficulty', type: 'enum', enum: QuizDifficulty, nullable: true })
  difficulty: QuizDifficulty;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Word)
  @JoinColumn({ name: 'word_id' })
  word: Word;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;
}

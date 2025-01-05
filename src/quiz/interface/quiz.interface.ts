export interface QuizRawStats {
  totalSolved: number;
  totalAttempts: number;
  attemptCounts: Record<number, number>;
}

export interface QuizStats {
  [difficulty: string]: {
    totalSolved: number;
    averageAttempts: number;
    attemptCounts: Record<number, number>;
  };
}

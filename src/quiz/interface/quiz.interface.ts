export interface QuizRawStats {
  totalSolved: number;
  totalAttempts: number;
  attemptCounts: Record<number, number>;
}

export interface QuizDifficultyStats {
  [difficulty: string]: {
    currentSolveStreak?: number | undefined;
    solveCount: number;
    averageAttempts: number;
    attemptCounts: Record<number, number>;
  };
}

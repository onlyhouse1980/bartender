export type QuizDrinkProgress = {
  attempts: number;
  correct: number;
  wrong: number;
};

export type QuizProgress = {
  totalAttempts: number;
  correctAnswers: number;
  wrongAnswers: number;
  currentStreak: number;
  bestStreak: number;
  byDrink: Record<string, QuizDrinkProgress>;
};

const STORAGE_KEY = 'barstart-de-quiz-progress-v1';

export function createEmptyQuizProgress(): QuizProgress {
  return {
    totalAttempts: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    currentStreak: 0,
    bestStreak: 0,
    byDrink: {},
  };
}

export function loadQuizProgress(): QuizProgress {
  const storage = getStorage();
  if (!storage) {
    return createEmptyQuizProgress();
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyQuizProgress();
    }

    const parsed = JSON.parse(raw) as unknown;
    return isQuizProgress(parsed) ? parsed : createEmptyQuizProgress();
  } catch {
    return createEmptyQuizProgress();
  }
}

export function saveQuizProgress(progress: QuizProgress) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore quota and private-mode storage failures.
  }
}

function getStorage() {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
}

function isQuizProgress(value: unknown): value is QuizProgress {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<QuizProgress>;
  return (
    typeof candidate.totalAttempts === 'number' &&
    typeof candidate.correctAnswers === 'number' &&
    typeof candidate.wrongAnswers === 'number' &&
    typeof candidate.currentStreak === 'number' &&
    typeof candidate.bestStreak === 'number' &&
    !!candidate.byDrink &&
    typeof candidate.byDrink === 'object'
  );
}

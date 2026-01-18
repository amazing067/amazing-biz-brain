export interface QuizQuestion {
  id: number;
  type: 'memory-input' | 'choice' | 'multi-choice' | 'clock' | 'reverse-number-input' | 'stroop' | 'time-calculation' | 'complex-calculation' | 'character-count';
  questionText: string;
  options?: string[];
  correctAnswer: string | string[] | number[];
  score: number;
  category: '기억력' | '지남력' | '계산력' | '시공간' | '집행기능' | '판단력' | '작업기억' | '억제능력' | '주의력';
  timeLimit?: number; // 초 단위
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    type: 'memory-input',
    questionText: '지금부터 보여드리는 그림 3개를 꼭 기억하세요. (나중에 물어봅니다!)',
    correctAnswer: ['🚂', '🌲', '⚽'], // 기차, 소나무, 축구공 이모지
    score: 0, // 기억 입력은 점수 없음
    category: '기억력',
  },
  {
    id: 2,
    type: 'reverse-number-input',
    questionText: '숫자가 하나씩 나타납니다. 보신 숫자를 거꾸로 입력하세요!',
    correctAnswer: [8, 4, 9, 2], // 표시될 순서: 2-9-4-8, 거꾸로: 8-4-9-2
    score: 20, // 작업기억은 점수 높게
    category: '작업기억',
    timeLimit: 20, // 15초는 짧아서 20초로
  },
  {
    id: 3,
    type: 'stroop',
    questionText: '글자 내용 말고, 글자 색깔을 선택하세요!',
    options: ['노랑', '빨강', '파랑', '검정'],
    correctAnswer: '파랑', // "노랑"이라는 글자가 파란색으로 표시됨
    score: 15,
    category: '억제능력',
    timeLimit: 15,
  },
  {
    id: 4,
    type: 'character-count',
    questionText: '아래 글자들 중에서 "ㅎ"이 몇 개 있는지 세어보세요.',
    correctAnswer: '5개',
    options: ['3개', '4개', '5개', '6개'],
    score: 15,
    category: '주의력',
    timeLimit: 15,
  },
  {
    id: 5,
    type: 'time-calculation',
    questionText: '지금은 오후 2시 20분입니다. 1시간 45분 전은 몇 시였을까요?',
    options: ['12시 35분', '1시 35분', '12시 55분', '1시 15분'],
    correctAnswer: '12시 35분',
    score: 15,
    category: '계산력',
    timeLimit: 15,
  },
  {
    id: 6,
    type: 'complex-calculation',
    questionText: '10,000원을 냈습니다. 1,500원짜리 김밥 3줄과 500원짜리 물 1개를 샀습니다. 거스름돈은?',
    options: ['4,000원', '4,500원', '5,000원', '5,500원'],
    correctAnswer: '5,000원',
    score: 15,
    category: '계산력',
    timeLimit: 15,
  },
  {
    id: 7,
    type: 'multi-choice',
    questionText: '테스트 종료! 아까 맨 처음에 봤던 3가지 기억나시나요?',
    options: ['🚂', '🐶', '🌲', '🚲', '⚽', '🎩', '👓', '🍇', '⌚'],
    correctAnswer: ['🚂', '🌲', '⚽'], // 기차, 소나무, 축구공
    score: 15, // 지연 회상 점수 조정
    category: '기억력',
  },
  {
    id: 8,
    type: 'choice',
    questionText: '오늘 검사를 도와주고 있는 제 이름은 무엇일까요?',
    options: ['곰돌이', '든든이', '똑똑이', '의사쌤'],
    correctAnswer: '든든이',
    score: 5, // 지남력 점수 낮춤
    category: '지남력',
  },
];

// 현재 계절 계산
function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

export type CategoryName = '기억력' | '지남력' | '계산력' | '시공간' | '집행기능' | '판단력' | '작업기억' | '억제능력' | '주의력';

export const CATEGORIES: CategoryName[] = ['기억력', '지남력', '계산력', '시공간', '작업기억', '억제능력', '주의력', '판단력'];

// 성별/연령별 기준점 (참고용)
export interface UserProfile {
  gender: 'male' | 'female' | '';
  age: number;
}

export const getNormalRange = (profile: UserProfile, category: CategoryName): { min: number; max: number } => {
  // 기본 정상 범위 (실제로는 의료 데이터 기반으로 조정 필요)
  const baseRanges: Record<CategoryName, { min: number; max: number }> = {
    기억력: { min: 80, max: 100 },
    지남력: { min: 70, max: 100 },
    계산력: { min: 70, max: 100 },
    시공간: { min: 70, max: 100 },
    집행기능: { min: 70, max: 100 },
    판단력: { min: 80, max: 100 },
    작업기억: { min: 60, max: 100 }, // 작업기억은 난이도 높아서 기준 낮춤
    억제능력: { min: 65, max: 100 },
    주의력: { min: 70, max: 100 },
  };

  let range = baseRanges[category];

  // 연령별 조정 (나이가 많을수록 기준 낮춤)
  if (profile.age >= 70) {
    range = { min: range.min - 10, max: range.max - 5 };
  } else if (profile.age >= 60) {
    range = { min: range.min - 5, max: range.max - 3 };
  }

  // 성별별 조정 (일부 영역에서 차이)
  if (category === '기억력' && profile.gender === 'female') {
    range = { min: range.min + 5, max: range.max }; // 여성이 기억력에서 약간 유리
  }

  return range;
};

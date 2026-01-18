export interface QuizQuestion {
  id: number;
  type: 'memory-input' | 'choice' | 'multi-choice' | 'clock' | 'reverse-number-input' | 'stroop' | 'time-calculation' | 'complex-calculation' | 'character-count' | 'symbol-count' | 'serial-subtraction' | 'reaction-speed' | 'family-care' | 'card-match' | 'schulte-table' | 'whack-a-mole';
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
    type: 'card-match',
    questionText: '카드를 3초 동안 기억하세요! 그 다음 짝을 맞춰주세요.',
    correctAnswer: 'completed', // 완료만 하면 됨
    score: 15,
    category: '기억력',
    timeLimit: 30, // 30초 제한
  },
  {
    id: 3,
    type: 'reverse-number-input',
    questionText: '숫자가 하나씩 나타납니다. 보신 숫자를 거꾸로 입력하세요!',
    correctAnswer: [7, 3, 8, 4, 9], // 표시될 순서: 9-4-8-3-7, 거꾸로: 7-3-8-4-9 (5자리로 증가)
    score: 20, // 작업기억은 점수 높게
    category: '작업기억',
    timeLimit: 18, // 5자리로 증가하여 시간 단축
  },
  {
    id: 4,
    type: 'stroop',
    questionText: '글자 내용 말고, 글자 색깔을 선택하세요!',
    options: ['노랑', '빨강', '파랑', '검정'],
    correctAnswer: '파랑', // "노랑"이라는 글자가 파란색으로 표시됨
    score: 15,
    category: '억제능력',
    timeLimit: 15,
  },
  {
    id: 5,
    type: 'schulte-table',
    questionText: '1부터 16까지 숫자를 순서대로 최대한 빨리 찾아주세요!',
    correctAnswer: 'completed', // 완료만 하면 됨
    score: 15,
    category: '주의력',
    timeLimit: 30, // 30초 제한 (차등 점수 적용)
  },
  {
    id: 6,
    type: 'symbol-count',
    questionText: "집중하세요! 아래 그림들 중에서 '♣️(세잎클로버)'가 총 몇 개인지 세어보세요.",
    correctAnswer: '7개',
    options: ['5개', '6개', '7개', '8개'],
    score: 15,
    category: '주의력',
    timeLimit: 10, // 10초로 단축 (난이도 상승)
  },
  {
    id: 7,
    type: 'serial-subtraction',
    questionText: "암산 문제입니다. 100에서 7을 빼고, 그 숫자에서 또 7을 빼고, 또 7을 뺍니다. 정답은 얼마일까요?",
    correctAnswer: '79',
    options: ['76', '79', '86', '83'],
    score: 15,
    category: '계산력',
    timeLimit: 20, // 20초로 단축 (난이도 상승)
  },
  {
    id: 8,
    type: 'complex-calculation',
    questionText: '20,000원을 냈습니다. 3,200원짜리 도시락 2개와 1,300원짜리 음료수 3개, 그리고 700원짜리 물 2개를 샀습니다. 거스름돈은?',
    options: ['7,500원', '8,300원', '9,100원', '9,500원'],
    correctAnswer: '8,300원', // 3,200*2 + 1,300*3 + 700*2 = 6,400 + 3,900 + 1,400 = 11,700원, 거스름돈 = 20,000 - 11,700 = 8,300원
    score: 15,
    category: '계산력',
    timeLimit: 15, // 복잡한 계산
  },
  {
    id: 9,
    type: 'multi-choice',
    questionText: '아까 맨 처음에 봤던 그림 3가지를 기억나시나요?',
    options: ['🚂', '🐶', '🌲', '🚲', '⚽', '🎩', '👓', '🍇', '⌚'],
    correctAnswer: ['🚂', '🌲', '⚽'], // 기차, 소나무, 축구공
    score: 15, // 지연 회상 점수 조정
    category: '기억력',
  },
  {
    id: 10,
    type: 'choice',
    questionText: '오늘 검사를 도와주고 있는 제 이름은 무엇일까요?',
    options: ['곰돌이', '든든이', '똑똑이', '의사쌤'],
    correctAnswer: '든든이',
    score: 5, // 지남력 점수 낮춤
    category: '지남력',
  },
  {
    id: 11,
    type: 'reaction-speed',
    questionText: '화면이 초록색으로 변하면 즉시 터치하세요!',
    correctAnswer: 'completed', // 완료만 하면 됨
    score: 15, // 반응 속도 평가 (0.4초 이내 만점, 0.05초당 -1점)
    category: '주의력',
  },
  {
    id: 12,
    type: 'whack-a-mole',
    questionText: '빨간색 곰돌이가 나오면 누르고, 파란색 곰돌이가 나오면 누르지 마세요!',
    correctAnswer: 'completed', // 완료만 하면 됨
    score: 15,
    category: '억제능력',
    timeLimit: 18, // 18초로 단축 (난이도 상승)
  },
  {
    id: 13,
    type: 'family-care',
    questionText: '만약 10년 뒤, 혼자 생활하기 어려워진다면... 누가 도와주실까요?',
    options: ['배우자', '자녀', '간병인/요양병원', '잘 모르겠다'],
    correctAnswer: '', // 정답 없음, 선택만 기록
    score: 0, // 점수 없음
    category: '판단력',
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

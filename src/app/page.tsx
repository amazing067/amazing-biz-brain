'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// 1. 데이터 정의 (모바일 최적화 텍스트)
// ============================================================================
type CategoryName = '기억력' | '지남력' | '계산력' | '시공간' | '집행기능' | '판단력' | '작업기억' | '억제능력' | '주의력' | '반응속도' | '시각탐색' | '시각추론' | '언어유창성';

interface QuizQuestion {
  id: number;
  type: string;
  category: CategoryName;
  questionText: string;
  options?: string[];
  correctAnswer?: any;
  score: number;
  timeLimit?: number; // 초 단위 (없으면 무제한)
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 1, type: 'memory-input', category: '기억력', questionText: "아래 3개 그림을 소리내어 읽고\n꼭 기억해주세요!", correctAnswer: [{ emoji: '🚂', text: '기차' }, { emoji: '🌲', text: '소나무' }, { emoji: '⚽', text: '축구공' }], score: 10, timeLimit: 10 },
  { id: 2, type: 'clock', category: '지남력', questionText: "아래 시계 중에서\n[3시 45분]을 찾아 눌러주세요.", options: ['3시 45분', '2시 15분', '9시 15분', '3시 15분'], correctAnswer: '3시 45분', score: 10, timeLimit: 20 },
  { id: 3, type: 'stroop', category: '억제능력', questionText: "글자의 내용은 무시하고\n[글자 색깔]을 고르세요!", options: ['빨강', '파랑', '노랑', '검정'], correctAnswer: '파랑', score: 10, timeLimit: 15 },
  { id: 4, type: 'symbol-count', category: '주의력', questionText: "아래 기호들 중에서\n♣️(세잎클로버)는 몇 개일까요?", options: ['5개', '6개', '7개', '8개'], correctAnswer: '7개', score: 10, timeLimit: 10 },
  { id: 5, type: 'reverse-number-input', category: '작업기억', questionText: "숫자를 기억했다가\n거꾸로 입력해주세요.", correctAnswer: [7,3,8,4,9], score: 10, timeLimit: 30 },
  { id: 6, type: 'complex-calculation', category: '계산력', questionText: "사과(1000원) 2개\n우유(1500원) 1개\n5000원을 냈다면 거스름돈은?", options: ['1000원', '1500원', '2000원', '2500원'], correctAnswer: '1500원', score: 10, timeLimit: 40 },
  { id: 7, type: 'serial-subtraction', category: '집행기능', questionText: "100 - 7 - 7 - 7 = ?\n문제의 답을 구하시오", options: ['86', '79', '93', '72'], correctAnswer: '79', score: 10, timeLimit: 25 },
  { id: 8, type: 'reaction-speed', category: '반응속도', questionText: "화면이 초록색으로 변하면\n빠르게 터치하세요!", correctAnswer: 'completed', score: 10, timeLimit: 10 },
  { id: 9, type: 'word-fluency', category: '언어유창성', questionText: "제시된 카테고리에 해당하는\n단어만 빠르게 선택하세요!", correctAnswer: 'completed', score: 10, timeLimit: 30 },
  { id: 10, type: 'multi-choice', category: '기억력', questionText: "아까 처음에 봤던\n그림 3개는 무엇이었나요?", options: ['🚂 기차', '🐶 강아지', '🌲 소나무', '🚲 자전거', '⚽ 축구공', '🎩 모자'], correctAnswer: ['🚂 기차', '🌲 소나무', '⚽ 축구공'], score: 20, timeLimit: 30 },
  { id: 11, type: 'card-match', category: '시공간', questionText: "카드의 위치를 기억해서\n짝을 맞춰보세요.", correctAnswer: 'completed', score: 10, timeLimit: 40 },
  { id: 12, type: 'whack-a-mole', category: '주의력', questionText: "빨간 곰돌이는 잡고,\n파란 곰돌이는 피하세요!", correctAnswer: 'completed', score: 10, timeLimit: 20 },
  { id: 13, type: 'schulte-table', category: '시각탐색', questionText: "1부터 16까지 숫자를\n순서대로 찾으세요.", correctAnswer: 'completed', score: 10, timeLimit: 40 },
  { id: 14, type: 'pattern-logic', category: '시각추론', questionText: "규칙을 찾아보세요.\n빈칸에 들어갈 도형은?", correctAnswer: '▲', score: 10, timeLimit: 20 },
  { id: 15, type: 'family-care', category: '판단력', questionText: "만약 10년 뒤, 돌봄이 필요하다면\n누가 도와줄 수 있나요?", options: ['배우자', '자녀', '간병인/요양병원', '잘 모르겠다'], correctAnswer: '', score: 1, timeLimit: 0 }
];

// ============================================================================
// [설정] 영역별 가중치 배점표 (총합 100점) - 이미지 분석 기반 재구성
// ============================================================================
const CATEGORY_WEIGHTS: Record<CategoryName, number> = {
  기억력: 25,      // [핵심] 치매 진단 최우선 항목 (배점 상향)
  지남력: 15,      // 시간/장소 인지 (중요)
  주의력: 10,      // 집중력
  계산력: 10,      // 금전 관리 능력
  언어유창성: 10,  // 전두엽 기능
  집행기능: 10,    // 문제 해결 능력
  시공간: 5,       // 길 찾기 등
  판단력: 5,       // 상황 대처
  작업기억: 5,     // 단기 정보 유지
  억제능력: 5,     // 충동 조절
  반응속도: 0,     // (보조 지표)
  시각탐색: 0,     // (보조 지표)
  시각추론: 0      // (보조 지표)
};
const CATEGORIES = Object.keys(CATEGORY_WEIGHTS) as CategoryName[];

// ============================================================================
// 2. 공통 컴포넌트 (가이드)
// ============================================================================

function GuideOverlay({ question, onStart, currentNum, totalNum }: { question: QuizQuestion; onStart: () => void; currentNum: number; totalNum: number; }) {
  const getIcon = (type: string) => {
    if (type === 'whack-a-mole') return '🐻';
    if (type === 'word-fluency') return '🎈';
    if (type === 'pattern-logic') return '🔺';
    if (type === 'card-match') return '🃏';
    if (type === 'reaction-speed') return '⚡';
    if (type === 'reverse-number-input') return '🔢';
    if (type === 'memory-input') return '🧠';
    if (type === 'clock') return '🕐';
    if (type === 'stroop') return '🎨';
    if (type === 'symbol-count') return '♣️';
    if (type === 'schulte-table') return '🔢';
    return '📝';
  };

  // 계산 문제는 가이드 화면에서 문제 텍스트를 숨김 (미리 풀 수 없도록)
  const shouldHideQuestion = question.type === 'complex-calculation' || question.type === 'serial-subtraction';
  
  // family-care 타입은 가이드 오버레이를 표시하지 않음 (바로 문제 표시)
  if (question.type === 'family-care') {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-fade-in-up">
        <div className="text-sm text-gray-500 mb-2">문제 {currentNum}/{totalNum}</div>
        <div className="text-7xl mb-6 animate-bounce">{getIcon(question.type)}</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{question.category}</h2>
        {shouldHideQuestion ? (
          <p className="text-xl text-gray-600 whitespace-pre-line mb-10 leading-relaxed font-medium">
            시작하기 버튼을 누르면{'\n'}문제가 나타납니다
          </p>
        ) : question.type === 'whack-a-mole' ? (
          <div className="mb-10 space-y-6">
            <p className="text-xl text-gray-600 whitespace-pre-line leading-relaxed font-medium mb-6">
              {question.questionText}
            </p>
            {/* 시각적 설명 */}
            <div className="flex flex-col items-center gap-4">
              {/* 빨간 곰돌이 - 클릭 */}
              <div className="flex items-center gap-3 bg-red-50 p-4 rounded-2xl border-2 border-red-200 w-full">
                <div className="relative">
                  <span className="text-5xl">🐻</span>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-lg font-bold text-red-600">빨간 곰돌이</div>
                  <div className="text-base text-gray-700">클릭</div>
                </div>
              </div>
              {/* 파란 곰돌이 - 클릭금지 */}
              <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 w-full">
                <div className="relative">
                  <span className="text-5xl">🐻</span>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✗</span>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-lg font-bold text-blue-600">파란 곰돌이</div>
                  <div className="text-base text-gray-700">클릭금지</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xl text-gray-600 whitespace-pre-line mb-10 leading-relaxed font-medium">
            {question.questionText}
          </p>
        )}
        <button 
          onClick={onStart}
          className="w-full bg-[#2E7D32] hover:bg-[#1b5e20] text-white text-2xl font-bold py-5 rounded-2xl shadow-lg active:scale-95 transition-transform"
        >
          시작하기 ▶
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 3. 게임별 컴포넌트 (로직 내장)
// ============================================================================

// [1] 기억력 입력 (단순 표시)
function MemoryInputGame({ correctAnswer, onComplete }: { correctAnswer: {emoji:string, text:string}[], onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 5000); // 5초 후 자동 넘김
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {correctAnswer.map((item, i) => (
        <div key={i} className="bg-orange-100 border-2 border-orange-200 aspect-[3/4] rounded-2xl flex flex-col items-center justify-center shadow-md animate-pulse">
          <div className="text-6xl mb-2">{item.emoji}</div>
          <div className="text-xl font-bold text-gray-800">{item.text}</div>
        </div>
      ))}
    </div>
  );
}

// [2] 시계, [3] 스트룹, [4] 심볼 등 객관식 공통
// 단순 버튼 클릭형은 메인에서 처리하지만, Stroop/Symbol 등은 비주얼이 필요하므로 컴포넌트화

function StroopGame({ onAnswer }: { onAnswer: (val: string) => void }) {
  return (
    <div className="w-full flex flex-col items-center space-y-8">
      <div className="bg-gray-100 w-full py-12 rounded-3xl flex items-center justify-center shadow-inner">
        <span className="text-8xl font-black" style={{ color: '#3B82F6' }}>노랑</span>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {['빨강', '파랑', '노랑', '검정'].map((opt) => (
          <button key={opt} onClick={() => onAnswer(opt)} className="bg-white border-2 border-gray-300 py-6 rounded-2xl text-2xl font-bold shadow-sm active:bg-gray-200">
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SymbolCountGame({ onAnswer }: { onAnswer: (val: string) => void }) {
  // 극한 난이도: 네잎클로버 제거, 5x5 그리드, 세잎클로버 7개, 스페이드 18개
  // 세잎클로버가 한 줄로 몰리지 않도록 섞어서 배치
  const symbols = [
    '♠️', '♣️', '♠️', '♠️', '♠️',  // 1행: 스페이드, 세잎, 스페이드, 스페이드, 스페이드 (세잎 1개)
    '♣️', '♠️', '♠️', '♣️', '♠️',  // 2행: 세잎, 스페이드, 스페이드, 세잎, 스페이드 (세잎 2개)
    '♠️', '♠️', '♣️', '♠️', '♣️',  // 3행: 스페이드, 스페이드, 세잎, 스페이드, 세잎 (세잎 2개)
    '♠️', '♣️', '♠️', '♠️', '♠️',  // 4행: 스페이드, 세잎, 스페이드, 스페이드, 스페이드 (세잎 1개)
    '♣️', '♠️', '♠️', '♠️', '♠️'   // 5행: 세잎, 스페이드, 스페이드, 스페이드, 스페이드 (세잎 1개) - 총 7개
  ];
  
  // 극한 난이도 효과들
  const rotations = [
    -22, 18, -15, 23, -19,   // 1행: -25°~25° 범위
    12, -24, 20, -18, 16,    // 2행
    -21, 14, -23, 19, -17,   // 3행
    15, -20, 22, -16, 21,    // 4행
    -14, 17, -25, 13, -12    // 5행
  ];
  
  const scales = [
    0.85, 1.15, 0.92, 1.08, 0.88,  // 1행: 80%~120% 크기 변형
    1.12, 0.82, 1.05, 0.95, 1.18,  // 2행
    0.90, 1.10, 0.87, 1.13, 0.98,  // 3행
    1.06, 0.84, 1.20, 0.91, 1.07,  // 4행
    0.93, 1.16, 0.86, 1.09, 0.94   // 5행
  ];
  
  const opacities = [
    0.75, 0.95, 0.68, 0.88, 0.72,  // 1행: 60%~100% 투명도
    0.92, 0.65, 0.85, 0.78, 0.98,  // 2행
    0.70, 0.90, 0.62, 0.87, 0.80,  // 3행
    0.83, 0.67, 0.95, 0.74, 0.89,  // 4행
    0.76, 0.93, 0.64, 0.86, 0.81   // 5행
  ];
  
  const bgOpacities = [
    0.92, 0.88, 0.95, 0.90, 0.93,  // 1행: 배경색 혼란 (90%~95% 투명도)
    0.89, 0.94, 0.91, 0.87, 0.96,  // 2행
    0.93, 0.88, 0.92, 0.89, 0.94,  // 3행
    0.90, 0.95, 0.88, 0.93, 0.91,  // 4행
    0.87, 0.92, 0.96, 0.89, 0.94   // 5행
  ];
  
  return (
    <div className="w-full flex flex-col items-center space-y-4">
      <div className="bg-white border-2 border-gray-200 p-4 rounded-3xl grid grid-cols-5 gap-2 w-full shadow-sm">
        {symbols.map((s, i) => (
          <div 
            key={i} 
            className="text-3xl flex justify-center items-center rounded-lg"
            style={{
              backgroundColor: `rgba(200, 200, 200, ${bgOpacities[i]})`, // 미묘한 배경색 혼란
            }}
          >
            {/* 극한 난이도: 원래 색상 복원 + 회전 + 크기 변형 + 투명도 */}
            <span style={{ 
              transform: `rotate(${rotations[i]}deg) scale(${scales[i]})`,
              display: 'inline-block',
              opacity: opacities[i],
            }}>{s}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        {['5개', '6개', '7개', '8개'].map(opt => (
          <button key={opt} onClick={() => onAnswer(opt)} className="bg-white border-2 border-gray-300 py-4 rounded-xl text-xl font-bold active:bg-gray-200">{opt}</button>
        ))}
      </div>
    </div>
  );
}

// [5] 숫자 거꾸로
function ReverseNumberGame({ correctAnswer, onComplete }: { correctAnswer: number[], onComplete: (ans: number[]) => void }) {
  const [showSeq, setShowSeq] = useState(true);
  const [idx, setIdx] = useState(-2); // -2: 안내문구, -1: 준비시작, 0~: 숫자
  const [userInputs, setUserInputs] = useState<number[]>([]);

  useEffect(() => {
    if (idx === -2) {
      // "숫자를 기억했다가 거꾸로 입력해주세요" 문구 표시 (2초)
      const t = setTimeout(() => setIdx(-1), 2000);
      return () => clearTimeout(t);
    } else if (idx === -1) {
      // "준비, 시작!" 문구 표시 (1.5초)
      const t = setTimeout(() => setIdx(0), 1500);
      return () => clearTimeout(t);
    } else if (idx < correctAnswer.length) {
      // 숫자 표시 (1초씩)
      const t = setTimeout(() => setIdx(idx + 1), 1000);
      return () => clearTimeout(t);
    } else {
      // "이제 숫자를 거꾸로 입력하세요!" 문구 표시 (1초)
      const t = setTimeout(() => setShowSeq(false), 1000);
      return () => clearTimeout(t);
    }
  }, [idx, correctAnswer.length]);

  if (showSeq) {
    return (
      <div className="bg-orange-100 w-full py-16 rounded-3xl flex justify-center items-center min-h-[300px] relative">
        {idx === -2 ? (
          <div className="text-center">
            <span className="text-3xl font-bold text-gray-700 whitespace-pre-line leading-relaxed">
              숫자를 기억했다가{'\n'}거꾸로 입력해주세요
            </span>
          </div>
        ) : idx === -1 ? (
          <span className="text-4xl font-bold text-gray-800 animate-pulse">준비, 시작!</span>
        ) : idx < correctAnswer.length ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              key={`num-${idx}`} 
              className="text-9xl font-black text-gray-800"
              style={{ 
                animation: 'fadeIn 0.3s ease-in',
              }}
            >
              {correctAnswer[idx]}
            </span>
          </div>
        ) : (
          <span className="text-3xl font-bold text-gray-500">이제 숫자를 거꾸로 입력하세요!</span>
        )}
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.5); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="bg-gray-100 py-6 rounded-2xl text-center text-3xl font-bold tracking-widest min-h-[80px] flex items-center justify-center">
        {userInputs.length === 0 ? <span className="text-gray-400 text-lg">숫자를 누르세요</span> : userInputs.join(' - ')}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {/* 첫 번째 줄: 1, 2, 3 */}
        {[1, 2, 3].map(num => (
          <button key={num} onClick={() => { if(userInputs.length < 5) setUserInputs([...userInputs, num]) }} className="py-4 bg-white border-2 border-gray-300 rounded-xl text-2xl font-bold active:bg-gray-200">{num}</button>
        ))}
        {/* 두 번째 줄: 4, 5, 6 */}
        {[4, 5, 6].map(num => (
          <button key={num} onClick={() => { if(userInputs.length < 5) setUserInputs([...userInputs, num]) }} className="py-4 bg-white border-2 border-gray-300 rounded-xl text-2xl font-bold active:bg-gray-200">{num}</button>
        ))}
        {/* 세 번째 줄: 7, 8, 9 */}
        {[7, 8, 9].map(num => (
          <button key={num} onClick={() => { if(userInputs.length < 5) setUserInputs([...userInputs, num]) }} className="py-4 bg-white border-2 border-gray-300 rounded-xl text-2xl font-bold active:bg-gray-200">{num}</button>
        ))}
        {/* 네 번째 줄: 지우기, 0, 확인 */}
        <button onClick={() => setUserInputs([])} className="py-4 bg-red-100 text-red-600 rounded-xl font-bold text-lg active:bg-red-200">지우기</button>
        <button onClick={() => { if(userInputs.length < 5) setUserInputs([...userInputs, 0]) }} className="py-4 bg-white border-2 border-gray-300 rounded-xl text-2xl font-bold active:bg-gray-200">0</button>
        <button onClick={() => onComplete(userInputs)} className="py-4 bg-green-600 text-white rounded-xl font-bold text-lg active:bg-green-700">확인</button>
      </div>
    </div>
  );
}

// [10] 다중 선택 게임
function MultiChoiceGame({ options, onComplete }: { options: string[]; onComplete: (selected: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  
  // 옵션이 없으면 빈 화면 반환
  if (!options || options.length === 0) {
    return <div className="text-center text-xl text-gray-500">옵션을 불러오는 중...</div>;
  }
  
  const handleSelect = (opt: string) => {
    if (selected.includes(opt)) {
      // 이미 선택된 항목이면 제거
      setSelected(prev => prev.filter(item => item !== opt));
    } else {
      // 최대 3개까지 선택 가능
      if (selected.length < 3) {
        setSelected(prev => [...prev, opt]);
      }
    }
  };
  
  const handleComplete = () => {
    if (selected.length === 3) {
      setTimeout(() => onComplete(selected), 0);
    }
  };
  
  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-700 mb-2">
          {selected.length}/3개 선택됨
        </div>
        {selected.length === 3 && (
          <button 
            onClick={handleComplete}
            className="mt-4 w-full bg-green-600 text-white py-4 rounded-2xl text-2xl font-bold shadow-lg active:bg-green-700"
          >
            확인
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4 w-full">
        {options.map((opt, i) => {
          const parts = opt.split(' ');
          const emoji = parts[0];
          const text = parts.slice(1).join(' ');
          const isSelected = selected.includes(opt);
          return (
            <button 
              key={i} 
              onClick={() => handleSelect(opt)} 
              className={`relative flex flex-col items-center justify-center py-6 border-2 rounded-2xl text-xl font-bold space-y-2 aspect-square transition-all ${
                isSelected 
                  ? 'bg-green-100 border-green-500 scale-105' 
                  : 'bg-white border-gray-300 active:bg-gray-100'
              }`}
            >
              <span className="text-6xl">{emoji}</span>
              <span className="text-lg">{text}</span>
              {isSelected && (
                <span className="absolute top-2 right-2 text-3xl text-green-600 font-bold">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// [9] 풍선 게임 (업그레이드: 지속적으로 풍선 생성)
// [9] 언어유창성 게임: 카테고리 단어 생성 게임 (Verbal Fluency Test 기반)
function WordFluencyGame({ onComplete }: { onComplete: () => void }) {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isDone, setIsDone] = useState(false);
  const [showFeedback, setShowFeedback] = useState<{word: string, isCorrect: boolean} | null>(null);
  const [showComplete, setShowComplete] = useState(false); // 모든 정답 완료 메시지
  const [showCategoryIntro, setShowCategoryIntro] = useState(true); // 카테고리 소개 화면
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalScoreRef = useRef(0);

  // 카테고리 데이터: [카테고리명, 정답 단어들, 오답 단어들]
  const categories = [
    {
      name: '과일',
      icon: '🍎',
      correct: ['사과', '바나나', '포도', '수박', '딸기', '참외', '복숭아', '자두', '배', '귤'],
      wrong: ['자동차', '책상', '컴퓨터', '비행기', '의자', '핸드폰', '시계', '신발', '가방', '옷']
    },
    {
      name: '동물',
      icon: '🐶',
      correct: ['강아지', '고양이', '사자', '호랑이', '곰', '토끼', '돼지', '소', '말', '닭'],
      wrong: ['나무', '꽃', '바다', '산', '강', '하늘', '별', '달', '태양', '구름']
    },
    {
      name: '색깔',
      icon: '🌈',
      correct: ['빨강', '파랑', '노랑', '초록', '보라', '주황', '분홍', '검정', '하양', '회색'],
      wrong: ['책', '펜', '지우개', '공책', '가방', '연필', '자', '가위', '풀', '색연필']
    }
  ];

  const currentCategory = categories[currentCategoryIndex];
  
  // 현재 라운드의 단어들 생성 (정답 + 오답 섞기)
  const [currentWords, setCurrentWords] = useState<string[]>([]);

  useEffect(() => {
    // 카테고리 변경 시 소개 화면 표시
    setShowCategoryIntro(true);
    generateWords();
    
    // 2초 후 소개 화면 숨기고 게임 시작
    const timer = setTimeout(() => {
      setShowCategoryIntro(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [currentCategoryIndex]);

  const generateWords = () => {
    // 정답 6개 + 오답 6개 = 총 12개 단어
    const correct = [...currentCategory.correct]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
    const wrong = [...currentCategory.wrong]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
    
    const allWords = [...correct, ...wrong].sort(() => Math.random() - 0.5);
    setCurrentWords(allWords);
    setSelectedWords(new Set());
  };

  const categoryIndexRef = useRef(0);
  const selectedWordsRef = useRef<Set<string>>(new Set());
  const currentWordsRef = useRef<string[]>([]);
  
  useEffect(() => {
    categoryIndexRef.current = currentCategoryIndex;
  }, [currentCategoryIndex]);
  
  useEffect(() => {
    selectedWordsRef.current = selectedWords;
  }, [selectedWords]);
  
  useEffect(() => {
    currentWordsRef.current = currentWords;
  }, [currentWords]);

  const endRound = useCallback(() => {
    // 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 현재 라운드 점수 계산 (ref 사용)
    const currentSelected = selectedWordsRef.current;
    const currentIdx = categoryIndexRef.current;
    const currentCat = categories[currentIdx];
    
    const roundScore = Array.from(currentSelected).filter(word => 
      currentCat.correct.includes(word)
    ).length;
    
    totalScoreRef.current += roundScore;

    // 다음 카테고리로 이동 또는 게임 종료
    if (currentIdx < categories.length - 1) {
      // 완료 메시지 표시
      setShowComplete(true);
      
      setTimeout(() => {
        setShowComplete(false);
        setCurrentCategoryIndex(currentIdx + 1);
        setTimeLeft(30);
        setScore(totalScoreRef.current);
        setSelectedWords(new Set()); // 새 라운드 시작
        selectedWordsRef.current = new Set(); // ref도 초기화
      }, 4000); // 완료 메시지 4초 표시 (다음 챕터로 넘어갈 때까지 충분한 시간)
    } else {
      // 모든 카테고리 완료
      setShowComplete(true);
      setIsDone(true);
      setScore(totalScoreRef.current);
      setTimeout(() => {
        setShowComplete(false);
        onComplete();
      }, 4000); // 완료 메시지 4초 표시 (게임 완료까지 충분한 시간)
    }
  }, [onComplete]);

  useEffect(() => {
    if (isDone) {
      // 게임 종료 시 타이머 정리
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // 타이머 시작 (새 라운드 시작 시마다 재시작)
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isDone, endRound, currentCategoryIndex]); // currentCategoryIndex 추가하여 새 라운드마다 타이머 재시작

  const handleWordClick = (word: string) => {
    if (isDone || selectedWords.has(word)) return;

    const isCorrect = currentCategory.correct.includes(word);
    
    setSelectedWords(prev => {
      const newSelected = new Set(prev).add(word);
      selectedWordsRef.current = newSelected; // ref 업데이트
      
      // 모든 정답을 선택했는지 확인
      const correctWordsInGame = currentWordsRef.current.filter(w => 
        currentCategory.correct.includes(w)
      );
      const selectedCorrectCount = Array.from(newSelected).filter(w => 
        currentCategory.correct.includes(w)
      ).length;
      
      // 모든 정답을 선택했으면 자동으로 다음 단계로
      if (selectedCorrectCount >= correctWordsInGame.length && correctWordsInGame.length > 0) {
        setTimeout(() => {
          endRound();
        }, 1000); // 피드백 표시 후 전환
      }
      
      return newSelected;
    });
    
    // 피드백 표시
    setShowFeedback({ word, isCorrect });
    setTimeout(() => setShowFeedback(null), 800);

    // 햅틱 피드백
    if (navigator.vibrate) {
      navigator.vibrate(isCorrect ? 50 : 100);
    }

    // 정답이면 점수 증가, 오답이면 감점
    if (isCorrect) {
      setScore(prev => prev + 1);
      totalScoreRef.current += 1;
    } else {
      // 오답 선택 시 -1점 감점
      setScore(prev => Math.max(0, prev - 1));
      totalScoreRef.current = Math.max(0, totalScoreRef.current - 1);
    }
  };

  const getWordButtonStyle = (word: string) => {
    if (!selectedWords.has(word)) {
      return 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50';
    }
    
    const isCorrect = currentCategory.correct.includes(word);
    if (isCorrect) {
      return 'bg-green-500 border-2 border-green-600 text-white';
    } else {
      return 'bg-red-400 border-2 border-red-500 text-white';
    }
  };

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-b from-blue-50 to-indigo-50 rounded-3xl overflow-hidden border-4 border-indigo-200 select-none">
      {/* 카테고리 소개 화면 - 각 챕터 시작 시 표시 */}
      {showCategoryIntro && (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-indigo-500 to-blue-600 flex flex-col items-center justify-center text-white">
          <div className="text-8xl mb-6 animate-bounce">{currentCategory.icon}</div>
          <div className="text-6xl font-black mb-4 text-center leading-tight">
            <div>{currentCategory.name}을</div>
            <div>찾으세요</div>
          </div>
          <div className="text-2xl font-bold text-indigo-100 mt-4">
            {currentCategoryIndex + 1}번째 챕터
          </div>
        </div>
      )}

      {/* 상단 정보창 - 컴팩트하게 */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-20">
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border-2 border-indigo-200">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{currentCategory.icon}</span>
            <span className="text-sm font-bold text-gray-800">{currentCategory.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border-2 border-indigo-200">
            <span className="text-sm font-black text-indigo-600">점수: {score}</span>
          </div>
          <div className={`bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border-2 ${
            timeLeft < 10 ? 'border-red-400 animate-pulse' : 'border-indigo-200'
          }`}>
            <span className={`text-sm font-black ${timeLeft < 10 ? 'text-red-500' : 'text-indigo-600'}`}>
              ⏳ {timeLeft}초
            </span>
          </div>
        </div>
      </div>

      {/* 진행 표시 - 컴팩트하게 */}
      <div className="absolute top-14 left-2 right-2 z-10">
        <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">
              {currentCategoryIndex + 1} / {categories.length}
            </span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${((currentCategoryIndex + 1) / categories.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 안내 문구 - 더 크고 명확하게 (모바일 최적화) */}
      {!showCategoryIntro && (
        <div className="absolute top-20 left-2 right-2 z-10 text-center px-2">
          <p className="bg-yellow-100 border-3 border-yellow-500 text-yellow-900 px-3 py-2 rounded-xl text-sm sm:text-lg font-black shadow-lg leading-tight">
            <span className="text-xl sm:text-2xl">{currentCategory.icon}</span> <span className="text-base sm:text-xl">{currentCategory.name}</span>에 해당하는 단어만 선택하세요!
          </p>
        </div>
      )}

      {/* 단어 그리드 - 한 화면에 모두 보이도록 조정 (모바일 최적화) */}
      {!showCategoryIntro && (
      <div className="absolute top-32 sm:top-36 left-2 right-2 bottom-2 sm:bottom-4 flex items-center justify-center">
        <div className="grid grid-cols-3 grid-rows-4 gap-2 w-full h-full max-w-md">
          {currentWords.map((word, index) => (
            <button
              key={`${word}-${index}`}
              onClick={() => handleWordClick(word)}
              disabled={selectedWords.has(word) || isDone}
              className={`
                ${getWordButtonStyle(word)}
                py-3 px-2 rounded-xl text-base font-bold shadow-md
                active:scale-95 transition-all duration-200
                disabled:opacity-70 disabled:cursor-not-allowed
                ${selectedWords.has(word) ? '' : 'hover:scale-105'}
                flex items-center justify-center
              `}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* 피드백 표시 */}
      {showFeedback && (
        <div 
          className={`absolute z-30 text-3xl font-black pointer-events-none ${
            showFeedback.isCorrect ? 'text-green-500' : 'text-red-500'
          }`}
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'popUp 0.8s ease-out forwards'
          }}
        >
          {showFeedback.isCorrect ? '✓ 정답!' : '✗ 오답'}
        </div>
      )}

      {/* 모든 정답 완료 메시지 - 더 오래 표시되도록 수정 */}
      {showComplete && (
        <div 
          className="absolute z-40 bg-green-500 text-white px-8 py-6 rounded-2xl shadow-2xl pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'fadeInStay 0.5s ease-in forwards'
          }}
        >
          <div className="text-center">
            <div className="text-5xl mb-2 animate-bounce">🎉</div>
            <div className="text-2xl font-black mb-1">모든 정답을 맞췄습니다!</div>
            {currentCategoryIndex < categories.length - 1 ? (
              <div className="text-lg font-bold mt-2">
                다음 챕터로 이동합니다...
              </div>
            ) : (
              <div className="text-lg font-bold mt-2">
                게임 완료!
              </div>
            )}
          </div>
        </div>
      )}

      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes fadeInStay {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes popUp {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// [기타 게임들 간소화 구현]
function ReactionGame({ onComplete }: { onComplete: (ms: number) => void }) {
  const [state, setState] = useState('wait'); // wait -> ready -> go -> result
  const [start, setStart] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);
  
  // 반응속도 통계 (우월감 조성용)
  const getReactionStats = (ms: number) => {
    const seconds = ms / 1000;
    if (seconds < 0.2) return { percentile: 95, message: '상위 5%! 천재급 반응속도!' };
    if (seconds < 0.25) return { percentile: 90, message: '상위 10%! 매우 우수합니다!' };
    if (seconds < 0.3) return { percentile: 80, message: '상위 20%! 우수한 반응속도!' };
    if (seconds < 0.35) return { percentile: 70, message: '상위 30%! 좋은 반응속도!' };
    if (seconds < 0.4) return { percentile: 60, message: '상위 40%! 평균보다 빠릅니다!' };
    if (seconds < 0.45) return { percentile: 50, message: '평균 수준입니다' };
    if (seconds < 0.5) return { percentile: 40, message: '평균보다 약간 느립니다' };
    if (seconds < 0.6) return { percentile: 30, message: '하위 30% 수준입니다' };
    return { percentile: 20, message: '반응속도 개선이 필요합니다' };
  };
  
  useEffect(() => {
      if(state==='wait') setTimeout(() => setState('ready'), 2000);
      if(state==='ready') setTimeout(() => { setState('go'); setStart(Date.now()); }, 1000 + Math.random()*2000);
      if(state==='result') {
        // 3초 후 다음 문제로 (통계 확인 시간)
        const t = setTimeout(() => onComplete(reactionTime), 3000);
        return () => clearTimeout(t);
      }
  }, [state, reactionTime, onComplete]);
  
  const handleClick = () => {
    if(state==='go') {
      const time = Date.now() - start;
      setReactionTime(time);
      setState('result');
    }
  };
  
  const stats = reactionTime > 0 ? getReactionStats(reactionTime) : null;
  
  return (
    <div onPointerDown={handleClick}
         className={`w-full h-[400px] rounded-3xl flex flex-col items-center justify-center text-3xl font-black text-white shadow-xl transition-colors px-4 ${state==='result'?'bg-blue-500':state==='go'?'bg-green-500':state==='ready'?'bg-yellow-400':'bg-red-500'}`}>
        {state==='result' ? (
          <>
            <div className="text-2xl sm:text-3xl mb-2">반응 시간</div>
            <div className="text-5xl sm:text-6xl font-black animate-pulse mb-2">{(reactionTime / 1000).toFixed(3)}초</div>
            <div className="text-lg sm:text-xl mt-2 opacity-80">{(reactionTime)}ms</div>
            {stats && (
              <div className="mt-4 text-center">
                <div className="text-xl sm:text-2xl font-bold mb-1">상위 {stats.percentile}%</div>
                <div className="text-base sm:text-lg opacity-90 px-2">{stats.message}</div>
              </div>
            )}
          </>
        ) : state==='go' ? (
          '터치!!!'
        ) : state==='ready' ? (
          '준비'
        ) : (
          '대기'
        )}
    </div>
  );
}

function WhackMoleGame({ onComplete }: { onComplete: (acc: number, cor: number, wro: number) => void }) {
  const [moles, setMoles] = useState<{ id: number; color: 'red' | 'blue'; position: number }[]>([]);
  const [score, setScore] = useState({ c: 0, w: 0, t: 0 });
  const [timeLeft, setTimeLeft] = useState(15);
  const [isDone, setIsDone] = useState(false);
  const scoreRef = useRef({ c: 0, w: 0, t: 0 });

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    if (isDone) return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(t);
          setIsDone(true);
          const s = scoreRef.current;
          const acc = s.t > 0 ? (s.c / s.t) * 100 : 0;
          setTimeout(() => onComplete(acc, s.c, s.w), 0);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isDone, onComplete]);

  useEffect(() => {
    if (isDone) return;
    const spawner = setInterval(() => {
      setMoles(p => {
        if (p.length >= 9) return p;
        const position = Math.floor(Math.random() * 9);
        if (p.find(m => m.position === position)) return p;
        const color: 'red' | 'blue' = Math.random() < 0.7 ? 'red' : 'blue';
        return [...p, { id: Date.now(), position, color }];
      });
    }, 700);
    const cleaner = setInterval(() => setMoles(p => p.filter(m => Date.now() - m.id < 1300)), 100);
    return () => { clearInterval(spawner); clearInterval(cleaner); };
  }, [isDone]);

  const hit = (m: { id: number; color: 'red' | 'blue'; position: number }) => {
    if (isDone) return;
    const isC = m.color === 'red';
    setScore(s => ({ c: s.c + (isC ? 1 : 0), w: s.w + (isC ? 0 : 1), t: s.t + 1 }));
    setMoles(p => p.filter(x => x.id !== m.id));
  };

  if (isDone) return <div className="text-3xl font-bold text-center p-10">종료!</div>;

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between px-4 font-bold text-xl">
        <span>점수: {score.c} <span className="text-red-500 text-sm">{score.w > 0 ? `(-${score.w})` : ''}</span></span>
        <span className="text-red-500">⏳ {timeLeft}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full max-w-[350px] mx-auto">
        {Array.from({ length: 9 }).map((_, i) => {
          const m = moles.find(x => x.position === i);
          return (
            <div key={i} className="h-24 bg-gray-200 rounded-xl relative overflow-hidden">
              {m && <button onPointerDown={() => hit(m)} className={`w-full h-full text-5xl flex items-center justify-center animate-bounce ${m.color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}>🐻</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SchulteTableGame({ onComplete }: { onComplete: (time: number) => void }) {
  const [nums] = useState(() => Array.from({ length: 16 }, (_, i) => i + 1).sort(() => Math.random() - 0.5));
  const [curr, setCurr] = useState(1);
  const [start] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(40);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const startRef = useRef(start);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    startRef.current = start;
  }, [onComplete, start]);

  useEffect(() => {
    if(done) return;
    const t = setInterval(() => {
      setTimeLeft(p => { 
        if (p <= 1) { 
          clearInterval(t); 
          setDone(true); 
          setTimeout(() => onCompleteRef.current(0), 0); 
          return 0; 
        } 
        return p - 1; 
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done]);

  const handleClick = (n: number) => {
    if (done) return;
    if (n === curr) {
      if (n === 16) { 
        setDone(true); 
        setTimeout(() => onCompleteRef.current((Date.now() - startRef.current) / 1000), 0); 
      }
      else setCurr(c => c + 1);
    }
  };

  return (
    <div className="w-full space-y-4 text-center">
      <div className="text-2xl font-bold">찾을 숫자: <span className="text-5xl text-green-600 animate-bounce">{curr > 16 ? '끝' : curr}</span></div>
      <div className="text-red-500 font-bold text-xl">남은 시간: {timeLeft}</div>
      <div className="grid grid-cols-4 gap-3 bg-gray-200 p-4 rounded-2xl">
        {nums.map(n => (
          <button 
            key={n} 
            onPointerDown={() => handleClick(n)} 
            className={`h-20 text-4xl font-bold bg-white rounded-xl shadow-md active:bg-gray-100 ${n < curr ? 'invisible' : ''}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function PatternLogicGame({ onComplete }: { onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState(20);
  const [isDone, setIsDone] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if(isDone) return;
    const t = setInterval(() => {
      setTimeLeft(p => { 
        if (p <= 1) { 
          clearInterval(t); 
          setIsDone(true); 
          setTimeout(() => onCompleteRef.current(), 0); 
          return 0; 
        } 
        return p - 1; 
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isDone]);

  const select = (s: string) => {
    if (isDone) return;
    if (s === '▲') { 
      setIsDone(true); 
      setTimeout(() => onCompleteRef.current(), 500); 
    }
  };

  const shapeColors: Record<string, string> = {
    '●': 'bg-red-500',
    '■': 'bg-blue-500',
    '▲': 'bg-green-500',
    '★': 'bg-yellow-500'
  };

  return (
    <div className="space-y-6 text-center w-full max-w-[500px] mx-auto">
      {/* 모바일 최적화: 두 줄로 나누어 표시 */}
      <div className="bg-gray-100 p-4 rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          {/* 첫 번째 줄 */}
          <div className="flex justify-center items-center gap-2 text-5xl">
            <span>●</span>
            <span>→</span>
            <span>■</span>
            <span>→</span>
            <span>▲</span>
            <span>→</span>
            <span>●</span>
          </div>
          {/* 두 번째 줄 */}
          <div className="flex justify-center items-center gap-2 text-5xl">
            <span>■</span>
            <span>→</span>
            <span className="text-red-500 font-bold">?</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3">규칙을 찾아 빈칸에 들어갈 도형을 선택하세요</p>
      </div>
      <div className="grid grid-cols-4 gap-3 w-full">
        {['●', '■', '▲', '★'].map((s, i) => (
          <button key={i} onClick={() => select(s)} disabled={isDone} className={`h-20 ${shapeColors[s]} border-2 rounded-2xl text-4xl shadow-xl active:bg-gray-100`}>{s}</button>
        ))}
      </div>
      <div className="text-red-500 font-bold text-2xl">⏱ {timeLeft}</div>
    </div>
  );
}

function CardGame({ onComplete }: { onComplete: () => void }) {
    const [phase, setPhase] = useState<'memorize' | 'play'>('memorize');
    const [flipped, setFlipped] = useState<number[]>([]);
    const [solved, setSolved] = useState<number[]>([]);
    const [attempts, setAttempts] = useState(0);
    const [timeLeft, setTimeLeft] = useState(40);
    const [isDone, setIsDone] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    // 카드는 컴포넌트 마운트 시 한 번만 생성하고 고정
    const cards = useRef<string[]>(
        useMemo(() => {
            const icons = ['🍎', '🍌', '🍇', '🍊', '🍉'];
            return [...icons, ...icons].sort(() => Math.random() - 0.5);
        }, [])
    );

    // memorize phase에서 5초 후 play phase로 전환
    useEffect(() => {
        if (phase === 'memorize') {
            const t = setTimeout(() => {
                setPhase('play');
            }, 5000);
            return () => clearTimeout(t);
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 'play' && !isDone) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        setIsDone(true);
                        setTimeout(() => onComplete(), 0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [phase, isDone, onComplete]);

    useEffect(() => {
        if (solved.length === 10 && !isDone) {
            setIsDone(true);
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeout(() => onComplete(), 0);
        }
    }, [solved, isDone, onComplete]);

    const click = (i: number) => {
        if (phase !== 'play' || isDone || flipped.length >= 2 || flipped.includes(i) || solved.includes(i)) return;
        const next = [...flipped, i];
        setFlipped(next);
        if (next.length === 2) {
            setAttempts(a => a + 1);
            if (cards.current[next[0]] === cards.current[next[1]]) {
                setTimeout(() => {
                    setSolved([...solved, ...next]);
                    setFlipped([]);
                }, 200);
            } else {
                setTimeout(() => setFlipped([]), 500);
            }
        }
    };

    if (phase === 'memorize') {
        return (
            <div className="text-center text-2xl font-bold p-6 animate-pulse">
                5초 동안<br/>위치를 기억하세요!
                <div className="grid grid-cols-4 gap-3 w-full max-w-[500px] mx-auto mt-6">
                    {cards.current.map((c, i) => (
                        <div key={i} className="h-28 text-7xl bg-white border-4 border-gray-300 rounded-2xl flex items-center justify-center shadow-lg">
                            {c}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-between px-4 font-bold text-xl">
                <span>짝: {solved.length / 2}/5</span>
                <span className="text-red-500">⏱ {timeLeft}초</span>
            </div>
            <div className="grid grid-cols-4 gap-3 w-full max-w-[500px] mx-auto">
                {cards.current.map((c, i) => (
                    <button 
                        key={i} 
                        onPointerDown={() => click(i)} 
                        className={`h-28 text-7xl border-4 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                            flipped.includes(i) || solved.includes(i) 
                                ? 'bg-white border-gray-300' 
                                : 'bg-[#EF6C00] border-[#EF6C00]'
                        }`}
                    >
                        {flipped.includes(i) || solved.includes(i) ? c : ''}
                    </button>
                ))}
            </div>
            <div className="text-center text-sm text-gray-500">시도: {attempts}회</div>
        </div>
    );
}

// ============================================================================
// 4. 메인 페이지 (Main Logic)
// ============================================================================
// ============================================================================
// [로직] 재무 시뮬레이션 (2025년 장기요양급여 기준)
// ============================================================================
// ============================================================================
// [로직] 2026년 장기요양급여 및 간병비 정밀 시뮬레이터 (최신 개정판)
// ============================================================================
const calculateFinancials = (score: number) => {
  // 1. 2026년 장기요양 등급별 재가급여 월 한도액 (확정 고시 반영)
  let grade = '';
  let limitAmount = 0; // 정부 지원 월 한도액
  let status = '';
  let careType = '';   
  let careCostDesc = '';

  if (score <= 35) {
    grade = '1등급 (최중증/와상)';
    limitAmount = 2512900; // 2026년 인상분 반영 (약 251만원)
    status = '전적인 도움 필요 (와상 상태)';
    careType = '요양병원 집중 치료 권장';
    careCostDesc = '요양병원비 + 사적 간병비(100% 본인부담)';
  } else if (score <= 50) {
    grade = '2등급 (중증)';
    limitAmount = 2331200; // 2026년 인상분 반영 (약 233만원)
    status = '상당 부분 도움 필요';
    careType = '요양원(시설) 입소 또는 방문요양';
    careCostDesc = '시설 급여 본인부담금 + 비급여 식대';
  } else if (score <= 65) {
    grade = '3등급 (중등도)';
    limitAmount = 1528200; // 2026년 인상분 반영
    status = '부분적 도움 필요';
    careType = '주야간보호센터 + 방문요양';
    careCostDesc = '센터 이용료(15%) + 식대';
  } else if (score <= 75) {
    grade = '4등급 (경증)';
    limitAmount = 1409700; // 2026년 인상분 반영
    status = '일정 부분 도움 필요';
    careType = '주야간보호센터 이용';
    careCostDesc = '센터 이용료(15%) + 식대';
  } else if (score <= 85) {
    grade = '5등급 (치매환자)';
    limitAmount = 1208900; // 2026년 인상분 반영
    status = '치매 특별 등급';
    careType = '인지활동형 방문요양';
    careCostDesc = '인지자극 프로그램 + 방문요양';
  } else if (score <= 92) {
    grade = '인지지원등급';
    limitAmount = 676320; // 2026년 인상분 반영
    status = '경미한 인지 저하';
    careType = '주야간보호(치매전담) 이용';
    careCostDesc = '예방 프로그램 + 복지용구';
  } else {
    grade = '정상 (등급 외)';
    limitAmount = 0;
    status = '양호';
    careType = '일상 생활 유지';
    careCostDesc = '건강관리 및 예방 비용';
  }

  // 2. 2026년 물가 기준 실제 발생 비용 시뮬레이션
  // * 핵심 Sales Logic: 정부 지원금이 올랐지만, 인건비(간병비) 상승폭이 더 커서 여전히 부족함
  
  let totalCost = 0;      // 월 총 필요 비용
  let coPay = 0;          // 법정 본인부담금 (재가 15%, 시설 20%)
  let nonCoveredCost = 0; // 비급여 (식대 + **사적 간병비**)

  if (score <= 35) { 
    // [1등급] 요양병원 입소 시나리오 (가장 강력한 세일즈 포인트)
    // 2026년 기준 간병비 시세: 하루 15~16만원 예상 -> 월 450~480만원
    // 병원비(진료비+식대): 월 150~200만원
    totalCost = 6500000; // 총 650만원 소요
    
    // 지원금: 요양병원은 건강보험 적용 (장기요양 아님). 
    // 하지만 고객 이해를 위해 '한도액만큼 지원받는다 쳐도 부족하다'는 논리로 비교
    const estimatedInsuranceSupport = 1800000; // 건강보험 공단부담금 예상치
    coPay = 700000; // 병원비 본인부담금
    nonCoveredCost = 4000000; // 사적 간병비 + 비급여 치료비/소모품
  } else if (score <= 50) {
    // [2등급] 요양원(시설) 입소
    // 시설 수가 인상으로 총 비용 약 300~350만원 예상
    totalCost = 3500000;
    // 시설급여 한도는 등급별 월 한도액과 다르게 '1일 수가'로 계산되나, 
    // 시뮬레이션상 재가 한도액의 약 1.1~1.2배 수준으로 가정
    const facilityLimit = Math.round(limitAmount * 1.1); 
    coPay = Math.round(facilityLimit * 0.2); // 시설 본인부담 20%
    nonCoveredCost = 600000; // 식대, 간식비, 상급침실료 (물가상승 반영)
  } else if (score <= 85) {
    // [3,4,5등급] 재가/데이케어 이용
    // 한도액 100% 소진 + 식대 + 추가 서비스 이용
    totalCost = limitAmount + 400000; 
    coPay = Math.round(limitAmount * 0.15); // 재가 본인부담 15%
    nonCoveredCost = 400000; // 식대, 간식비, 한도 초과분
  } else if (score <= 92) {
    // [인지지원등급]
    totalCost = limitAmount + 300000;
    coPay = Math.round(limitAmount * 0.15);
    nonCoveredCost = 300000;
  } else {
    // [정상]
    totalCost = 200000;
    coPay = 0;
    nonCoveredCost = 200000;
  }

  // 실질적 본인 부담금 (총비용 - 정부지원 추산액)
  // * 1등급(요양병원)의 경우 장기요양한도가 아니라 건강보험 지원을 제외한 금액
  const realGovSupport = score <= 35 ? 1800000 : limitAmount; 
  const finalSelfPay = totalCost - realGovSupport;

  // 3. 미래 가치 산출 (10년 뒤, 연 물가상승률 4% 가정 - 간병비는 더 빨리 오름)
  const futureYears = 10;
  // *일반 물가는 3% 오르지만, 인건비(간병비)는 5% 이상 오름 -> 평균 4% 적용
  const inflation = 1.48; // 1.04^10 (약 1.5배 상승)

  // 4. 항목별 상세 비용 계산 (현재 기준 -> 미래 기준)
  let baseCaregiver = 0; // 간병비 (비급여)
  let baseMedical = 0;   // 병원비/시설비 (급여+비급여)
  let baseLiving = 0;    // 식대/기저귀 등 (비급여)
  let futureGovSupportRate = 0; // 정부 지원 비율 (예상)

  if (score <= 35) { // 1등급 (요양병원)
    baseCaregiver = 4500000; // 월 15만원 x 30일
    baseMedical = 1000000;   // 진료비/약제비
    baseLiving = 500000;     // 식대/소모품
    futureGovSupportRate = 0.2;    // 병원비 일부만 지원 (간병비 0원 지원)
  } else if (score <= 50) { // 2등급 (요양원)
    baseCaregiver = 500000;  // 시설 내 공동 간병비 (본인부담금 포함)
    baseMedical = 2000000;   // 시설 급여 수가
    baseLiving = 500000;     // 식대/상급침실료
    futureGovSupportRate = 0.8;    // 시설급여 80% 지원
  } else if (score <= 85) { // 재가 (센터)
    baseCaregiver = 0;       // 가족 돌봄 가정
    baseMedical = 1500000;   // 재가 급여 한도
    baseLiving = 300000;     // 식비 등
    futureGovSupportRate = 0.85;   // 재가급여 85% 지원
  } else if (score <= 92) { // 인지지원등급
    baseCaregiver = 0;       // 가족 돌봄 가정
    baseMedical = 676320;    // 인지지원등급 한도액
    baseLiving = 300000;     // 식비 등
    futureGovSupportRate = 0.85;   // 재가급여 85% 지원
  } else {
    baseCaregiver = 0;
    baseMedical = 100000;
    baseLiving = 100000;
    futureGovSupportRate = 0;
  }

  // 미래 가치 환산
  const futureCaregiver = Math.round(baseCaregiver * inflation);
  const futureMedical = Math.round(baseMedical * inflation);
  const futureLiving = Math.round(baseLiving * inflation);
  
  const futureTotalCost = futureCaregiver + futureMedical + futureLiving;
  
  // 지원금 계산 (간병비는 지원 제외가 핵심)
  const futureGovSupport = Math.round(futureMedical * futureGovSupportRate);
  
  // 내가 낼 돈
  const futureSelfPay = futureTotalCost - futureGovSupport;

  return { 
    grade, 
    limitAmount, 
    status, 
    careType, 
    careCostDesc, 
    realGovSupport, 
    coPay, 
    nonCoveredCost, 
    finalSelfPay,
    // 미래 비용 관련
    futureYears,
    futureTotalCost,
    futureGovSupport,
    futureSelfPay: futureSelfPay,
    // 상세 내역 리턴
    futureDetails: {
      caregiver: futureCaregiver,
      medical: futureMedical,
      living: futureLiving
    }
  };
};

// ============================================================================
// 4. 메인 페이지 로직 (Home)
// ============================================================================
export default function Home() {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<any>({});
  const [userProfile, setUserProfile] = useState({ age: 0 });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // ★ 건너뛰기 방지용 락

  // 테스트 모드: URL 파라미터로 결과 화면 바로 보기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('test') === 'result') {
        // 테스트용 더미 답변 설정
        const testAnswers: any = {};
        QUIZ_QUESTIONS.forEach(q => {
          if (q.type === 'memory-input') testAnswers[q.id] = 'viewed';
          else if (q.type === 'reaction-speed') testAnswers[q.id] = 300;
          else if (q.type === 'schulte-table') testAnswers[q.id] = 15;
          else if (q.type === 'whack-a-mole') testAnswers[q.id] = { acc: 80, wro: 2 };
          else if (q.type === 'reverse-number-input') testAnswers[q.id] = [9,4,8,3,7];
          else if (q.type === 'multi-choice') testAnswers[q.id] = q.correctAnswer;
          else if (['card-match','word-fluency','pattern-logic'].includes(q.type)) testAnswers[q.id] = 'done';
          else if (q.type === 'family-care') testAnswers[q.id] = '자녀';
          else testAnswers[q.id] = q.correctAnswer;
        });
        setAnswers(testAnswers);
        setUserProfile({ age: 65 });
        setStep(QUIZ_QUESTIONS.length); // 결과 화면으로 바로 이동
      }
    }
  }, []);

  // 문제 변경 시 가이드 켜기 (family-care는 제외)
  useEffect(() => {
    if (step >= 0 && step < QUIZ_QUESTIONS.length) {
      const currentQ = QUIZ_QUESTIONS[step];
      // family-care 타입은 가이드 오버레이를 표시하지 않음
      if (currentQ.type === 'family-care') {
        setShowGuide(false);
      } else {
        setShowGuide(true);
      }
      setIsTransitioning(false); // 새 문제 시작 시 락 해제
    }
  }, [step]);

  const goNext = useCallback((answerValue: any) => {
    if (isTransitioning) return; // 이미 넘어가는 중이면 무시
    setIsTransitioning(true);

    const q = QUIZ_QUESTIONS[step];
    setAnswers((prev: any) => ({ ...prev, [q.id]: answerValue }));

    // 약간의 딜레이 후 다음 문제로
    setTimeout(() => {
      setStep(prev => prev + 1);
    }, 500);
  }, [step, isTransitioning]);

  // 인트로
  if (step === -1) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-orange-50 p-6 space-y-10">
        <div className="text-9xl animate-bounce">🐻</div>
        <h1 className="text-4xl font-black text-[#2E7D32]">든든이 뇌 검진</h1>
        <button onClick={() => setStep(0)} className="w-full bg-[#2E7D32] text-white py-6 rounded-3xl text-2xl font-bold shadow-xl active:scale-95 transition-transform">
          검사 시작하기
        </button>
      </div>
    );
  }

  // [점수 계산 함수]
  const calculateResult = () => {
    let weightTotal = 0;
    const catScores: any = {};
    const catMax: any = {};

    // 초기화
    Object.keys(CATEGORY_WEIGHTS).forEach(c => { catScores[c] = 0; catMax[c] = 0; });

    QUIZ_QUESTIONS.forEach(q => {
      const ans = answers[q.id];
      if (!ans) return;
      catMax[q.category] = (catMax[q.category] || 0) + q.score;
      
      let earned = 0;
      // -- 채점 로직 --
      if (q.type === 'reaction-speed') {
        earned = (ans <= 400) ? q.score : Math.max(0, q.score - Math.ceil((ans-400)/50));
      } else if (q.type === 'schulte-table') {
        earned = (ans <= 18 && ans > 0) ? q.score : Math.max(0, q.score - Math.ceil(ans-18));
      } else if (q.type === 'whack-a-mole') {
        earned = Math.max(0, Math.round(q.score * ((ans.acc || 0)/100)) - (ans.wro || 0));
      } else if (q.type === 'reverse-number-input') {
         const correct = [...(q.correctAnswer as number[])].reverse();
         let match = 0; 
         (Array.isArray(ans) ? ans : []).forEach((v:any,i:number)=> { if(v===correct[i]) match++ });
         earned = Math.round(q.score * (match / correct.length));
      } else if (q.type === 'multi-choice') {
         const match = (q.correctAnswer as string[]).filter(v => (Array.isArray(ans) ? ans : []).includes(v)).length;
         earned = Math.round(q.score * (match / 3));
      } else if (['card-match','word-fluency','pattern-logic'].includes(q.type)) {
         if (ans === 'done' || ans === true) earned = q.score;
      } else if (q.type === 'memory-input') {
        earned = ans === 'viewed' ? q.score : 0;
      } else if (q.type === 'family-care') {
        // 가족 돌봄 질문은 답변만 하면 점수 부여
        earned = ans ? q.score : 0;
      } else if (String(ans) === String(q.correctAnswer)) {
        earned = q.score;
      }

      catScores[q.category] = (catScores[q.category] || 0) + earned;
    });

    // 가중치 적용 합산
    Object.keys(CATEGORY_WEIGHTS).forEach(c => {
      // 해당 카테고리 문제가 출제되었을 때만 점수 반영
      if (catMax[c] > 0) {
        weightTotal += (catScores[c] / catMax[c]) * (CATEGORY_WEIGHTS[c as CategoryName] || 0);
      }
    });

    return { total: Math.round(weightTotal), details: catScores, maxDetails: catMax };
  };

  // --------------------------------------------------------------------------
  // [결과 화면 렌더링] ★ 여기가 핵심 수정 부분입니다 ★
  // --------------------------------------------------------------------------
  if (step >= QUIZ_QUESTIONS.length) {
    const { total, details, maxDetails } = calculateResult();
    const financials = calculateFinancials(total);
    const { 
      grade, 
      limitAmount, 
      status, 
      careType, 
      realGovSupport, 
      coPay, 
      nonCoveredCost, 
      finalSelfPay,
      futureYears = 10,
      futureTotalCost = 0,
      futureGovSupport = 0,
      futureSelfPay = 0,
      futureDetails = { caregiver: 0, medical: 0, living: 0 }
    } = financials;
    
    // 가족 돌봄 답변에 따른 메시지 (미래 비용 기준)
    const familyCareAnswer = answers[15] || '';
    const familyWarning = (familyCareAnswer === '배우자' || familyCareAnswer === '자녀') 
        ? `⚠️ 가족(${familyCareAnswer})에게 월 ${Math.round(futureSelfPay/10000).toLocaleString()}만원의\n경제적 부담을 지우게 됩니다.`
        : "⚠️ 준비된 보험이 없다면\n노후 파산 위험이 있습니다.";

    return (
      <div className="flex flex-col items-center w-full p-3 space-y-3 bg-gray-50">
        
        {/* 1. 상단 등급 카드 */}
        <div className="bg-white w-full p-4 rounded-2xl shadow-lg border border-gray-100 text-center">
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-400">2026년 기준 분석</span>
                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full">AI 정밀진단</span>
            </div>
            <div className="flex items-center justify-center gap-5">
                <div className={`flex flex-col items-center justify-center w-28 h-28 rounded-full border-8 ${total >= 80 ? 'border-green-500' : 'border-red-500'}`}>
                    <span className={`text-4xl font-black ${total >= 80 ? 'text-green-600' : 'text-red-600'}`}>{total}</span>
                    <span className={`text-sm font-bold ${total >= 80 ? 'text-green-500' : 'text-red-500'} mt-1`}>/ 100점</span>
                </div>
                <div className="text-left">
                    <p className="text-xs text-gray-400 mb-1">예상 장기요양등급</p>
                    <p className="text-lg font-bold text-gray-900 leading-tight mb-1">{grade.split('(')[0]}</p>
                    <p className={`text-xs font-bold ${total>=80?'text-green-600':'text-red-500'}`}>({status})</p>
                </div>
            </div>
        </div>

        {/* 2. 영역별 상세 점수 */}
        <div className="w-full bg-white p-3 rounded-2xl shadow-sm">
           <h3 className="font-bold text-gray-600 mb-2 text-xs">📊 영역별 상세 점수</h3>
           <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
             {Object.entries(CATEGORY_WEIGHTS).map(([cat, weight]) => {
                if (weight === 0) return null;
                const actualScore = details[cat] || 0;
                const actualMax = maxDetails[cat] || 1;
                // 가중치 점수로 변환 (총점 계산 방식과 동일)
                const weightedScore = actualMax > 0 
                  ? Math.round((actualScore / actualMax) * weight)
                  : 0;
                const weightedMax = weight; // 가중치가 최대 점수
                const percent = weightedMax > 0 ? Math.round((weightedScore / weightedMax) * 100) : 0;
                return (
                  <div key={cat} className="flex flex-col">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{cat}</span>
                        <span className={percent<60?'text-red-500 font-bold':'text-blue-500'}>{weightedScore}점 / {weightedMax}점</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${percent<60?'bg-red-500':'bg-blue-500'}`} style={{width: `${percent}%`}}></div>
                    </div>
                  </div>
                );
             })}
           </div>
        </div>

        {/* 3. 2026년 월 예상 비용 (현재 기준) */}
        <div className="w-full bg-white p-4 rounded-2xl shadow-xl border-2 border-blue-50 relative">
            <div className="mb-3 flex justify-between items-end border-b border-gray-100 pb-1.5">
                <div>
                    <h3 className="text-base font-bold text-gray-800">📊 2026년 월 예상 비용</h3>
                    <p className="text-[9px] text-gray-400">* 2026년 기준 실제 수가 반영 | 비급여 포함</p>
                </div>
                <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">현재 기준</span>
            </div>

            <div className="space-y-3">
                {/* 정부 지원금 (파란색) */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-blue-600 font-bold">국가 지원금 (최대)</span>
                        <span className="font-bold text-blue-600">{realGovSupport.toLocaleString()}원</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }}></div>
                    </div>
                </div>

                {/* 내 돈 (빨간색 - 강조) */}
                <div>
                    <div className="flex justify-between text-xs mb-1 items-end">
                        <span className="text-red-600 font-bold flex items-center gap-1">
                            실제 본인 부담금 <span className="text-[9px] bg-red-100 px-1 rounded">월</span>
                        </span>
                        <span className="text-xl font-black text-red-600">
                            {finalSelfPay.toLocaleString()}원
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10"></div>
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    
                    {/* 상세 내역 (근거 제시) */}
                    <div className="bg-red-50 p-2 rounded-lg mt-1.5 space-y-0.5">
                        <div className="flex justify-between text-[10px] text-gray-600">
                            <span>① 법정 본인부담금</span>
                            <span>{coPay.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-red-700 font-bold">
                            <span>② 비급여 (식대/간병비)</span>
                            <span>+{nonCoveredCost.toLocaleString()}원</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 출처 명시 */}
            <div className="mt-2 p-1.5 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-[9px] text-blue-700 text-center">
                    📋 2026년 장기요양 수가 고시 기준 반영
                </p>
            </div>
        </div>

        {/* 4. [핵심] 2036년 미래 비용 시뮬레이션 (10년 후 예상) */}
        <div className="w-full bg-white rounded-2xl shadow-xl border-2 border-red-100 relative">
            <div className="w-full bg-red-600 text-white text-[10px] font-bold text-center py-1.5 animate-pulse rounded-t-2xl">
                🚨 {futureYears || 10}년 후 (2036년) 예상 비용 | 물가상승률 반영
            </div>

            <div className="p-4">
            <div className="mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-gray-800">📉 10년 후 월 예상 간병비</h3>
                    <span className="text-[9px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">미래 예상</span>
                </div>
                <p className="text-[10px] text-gray-500">"{careType}" 이용 시 예상 월 지출액</p>
            </div>

            {/* 메인 그래프 */}
            <div className="space-y-3 mb-4">
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-blue-600 font-bold">국가 지원금 (예상)</span>
                        <span className="font-bold text-blue-600 text-base">{(futureGovSupport || 0).toLocaleString()}원</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                        {(futureGovSupport || 0) > 0 ? (
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((futureGovSupport / futureTotalCost) * 100, 100)}%` }}></div>
                        ) : (
                            <div className="h-full bg-gray-200 rounded-full"></div>
                        )}
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-1.5 items-end">
                        <span className="text-red-600 font-bold">실제 본인 부담금</span>
                        <span className="text-2xl font-black text-red-600">
                            {futureSelfPay >= 10000 
                                ? `${Math.round(futureSelfPay / 10000)}만원`
                                : `${futureSelfPay.toLocaleString()}원`
                            }
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600"></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10"></div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 text-right">{(futureSelfPay || 0).toLocaleString()}원</p>
                </div>
            </div>

            {/* ★ 상세 산출 근거 (영수증 스타일) - 개선 버전 */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border-2 border-gray-300 shadow-inner">
                <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-gray-400">
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        🧾 <span>비용 산출 상세 내역 (월 기준)</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">
                            물가상승 1.5배 적용
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600">
                            <span>📈</span>
                            <span>연 4% × 10년</span>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-3 text-sm">
                    {/* ① 간병비 - 가장 강조 */}
                    <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-500 shadow-md">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-red-700 flex items-center gap-1">
                                ① 사적 간병비 (인건비)
                                <span className="text-[8px] bg-red-200 px-1 rounded">최대 부담</span>
                            </span>
                            <span className="text-lg font-black text-red-600">{((futureDetails?.caregiver) || 0).toLocaleString()}원</span>
                        </div>
                        <p className="text-[10px] text-red-700 font-bold mt-1 bg-red-100 px-2 py-1 rounded">
                            ⚠️ 정부 지원 없음 (100% 본인 부담) | 실손보험 비적용
                        </p>
                    </div>
                    
                    {/* ② 의료비 */}
                    <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">② 병원비/시설비</span>
                            <span className="font-bold text-gray-800">{((futureDetails?.medical) || 0).toLocaleString()}원</span>
                        </div>
                    </div>
                    
                    {/* ③ 생활비 */}
                    <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">③ 식대/소모품 (기저귀 등)</span>
                            <span className="font-bold text-gray-800">{((futureDetails?.living) || 0).toLocaleString()}원</span>
                        </div>
                    </div>
                    
                    {/* 합계 및 최종 계산 */}
                    <div className="bg-gray-200 p-3 rounded-lg border-2 border-gray-400 mt-3 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-400">
                            <span className="font-bold text-gray-800">총 비용 합계 (2036년 예상)</span>
                            <span className="text-lg font-black text-gray-900">{(futureTotalCost || 0).toLocaleString()}원</span>
                        </div>
                        
                        {/* 국가 지원금 차감 */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-600 font-semibold">- 국가 지원금 (예상)</span>
                            <span className="font-bold text-blue-600">{(futureGovSupport || 0).toLocaleString()}원</span>
                        </div>
                        
                        {/* 최종 본인 부담금 */}
                        <div className="flex justify-between items-center pt-2 border-t-2 border-red-400 bg-red-50 -mx-3 -mb-3 p-3 rounded-b-lg">
                            <span className="font-bold text-red-700">= 실제 본인 부담금</span>
                            <span className="text-xl font-black text-red-600">{(futureSelfPay || 0).toLocaleString()}원</span>
                        </div>
                        
                        <div className="text-[10px] text-gray-600 mt-2 space-y-1 pt-2 border-t border-gray-300">
                            <p className="text-right font-semibold">* 계산 근거:</p>
                            <p className="text-right">2026년 기준 비용 × 물가상승률 1.5배</p>
                            <p className="text-right text-gray-500">(연 평균 4% 상승 × 10년 = 1.04¹⁰ ≈ 1.48배)</p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 p-5 bg-red-100 rounded-lg border-2 border-red-400 shadow-md">
                    <div className="text-center">
                        <p className="text-base font-black text-red-800 mb-3">🚨 간병비는 실손보험 미적용</p>
                        <p className="text-sm font-bold text-red-700 leading-relaxed">
                            사적 간병비는 건강보험/장기요양/실손보험 모두 비적용 항목입니다.<br/>
                            오직 치매/간병 보험으로만 준비 가능합니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* 경고 멘트 */}
            <div className="mt-5 text-center p-5 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-3 border-red-400 shadow-lg">
                <p className="text-lg sm:text-xl font-bold text-red-700 whitespace-pre-line leading-relaxed">{familyWarning}</p>
            </div>
            </div>
        </div>

        {/* 5. 장기요양 등급별 한도액 표 (신뢰도 상승) */}
        <div className="w-full bg-blue-50 p-5 rounded-2xl">
            <h4 className="font-bold text-blue-900 text-sm mb-3">💡 2026년 등급별 월 한도액 (인상)</h4>
            <div className="text-xs space-y-1 text-blue-800">
                <div className="flex justify-between border-b border-blue-200 pb-1">
                    <span>1등급</span>
                    <span className="font-bold">2,512,900원</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 pb-1">
                    <span>2등급</span>
                    <span className="font-bold">2,331,200원</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 pb-1">
                    <span>3등급</span>
                    <span className="font-bold">1,528,200원</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 pb-1">
                    <span>4등급</span>
                    <span className="font-bold">1,409,700원</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 pb-1">
                    <span>5등급</span>
                    <span className="font-bold">1,208,900원</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 pb-1">
                    <span>인지지원등급</span>
                    <span className="font-bold">676,320원</span>
                </div>
                <p className="text-[10px] text-blue-400 mt-1 text-right">* 본인부담금 제외 전 금액</p>
            </div>
        </div>

        {/* 6. DB 입력 (보험 설계 유도) */}
        <div className="w-full bg-gradient-to-br from-[#1a237e] to-[#283593] p-5 rounded-3xl text-center shadow-2xl text-white relative mt-2">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-400 animate-pulse rounded-t-3xl"></div>
            <div className="pt-2">
            <p className="text-yellow-300 font-bold text-sm mb-1">📢 보험 전문가 무료 점검</p>
            <h3 className="text-lg font-bold mb-3 leading-snug">
                "매월 {((futureSelfPay || 0) / 10000).toFixed(0)}만원,<br/>
                <span className="text-white border-b-2 border-yellow-400">내 보험으로 해결 될까요?</span>"
            </h3>

            <div className="flex flex-col gap-2.5">
                <input 
                    type="tel" 
                    placeholder="휴대폰 번호 입력 (-없이)" 
                    className="w-full p-4 rounded-xl bg-white text-gray-900 text-center font-bold text-lg shadow-lg border-2 border-white/50 outline-none focus:ring-4 focus:ring-yellow-400 focus:border-yellow-400" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                />
                
                <div className="bg-black/20 p-2.5 rounded-lg text-left space-y-1.5">
                    <label className="flex items-start gap-2 text-[10px] text-gray-200 cursor-pointer">
                        <input type="checkbox" id="agree1" className="mt-0.5" />
                        <span><span className="text-yellow-400 font-bold">[필수]</span> 개인정보 수집 및 이용 동의</span>
                    </label>
                    <label className="flex items-start gap-2 text-[10px] text-gray-200 cursor-pointer">
                        <input type="checkbox" id="agree2" className="mt-0.5" />
                        <span><span className="text-yellow-400 font-bold">[필수]</span> 보험 상품 안내 및 마케팅 활용 동의</span>
                    </label>
                </div>

                <button 
                    onClick={async () => {
                        const chk1 = document.getElementById('agree1') as HTMLInputElement;
                        const chk2 = document.getElementById('agree2') as HTMLInputElement;
                        
                        // 1차 검증: 필수 동의 체크 확인
                        if(!chk1?.checked || !chk2?.checked) {
                            const missing = [];
                            if(!chk1?.checked) missing.push('개인정보 수집 및 이용 동의');
                            if(!chk2?.checked) missing.push('보험 상품 안내 및 마케팅 활용 동의');
                            
                            return alert(`⚠️ 필수 동의 항목을 체크해주세요\n\n아래 항목에 체크 표시를 해주세요:\n\n${missing.map((m, i) => `[필수] ${m}`).join('\n')}\n\n모든 필수 항목에 동의하셔야\n보험 설계 서비스를 이용하실 수 있습니다.`);
                        }
                        
                        if(phoneNumber.length < 10) {
                            return alert('📱 전화번호 확인\n\n연락받으실 휴대폰 번호를\n정확히 입력해주세요.');
                        }
                        
                        // 2차 최종 확인 (막 눌러서 실수 방지)
                        const confirmMessage = `📞 전문 보험설계사 연락 안내\n\n입력하신 번호: ${phoneNumber}\n\n✅ 전문 보험설계사가 직접 연락드려\n   • 무료 보장분석\n   • 맞춤형 간병비 보험 설계안\n   을 무료로 제공해드립니다.\n\n⚠️ 연락을 받으시겠습니까?\n\n(취소하시면 신청이 되지 않습니다)`;
                        
                        if(!confirm(confirmMessage)) {
                            return; // 사용자가 취소하면 아무것도 하지 않음
                        }
                        
                        // 서버로 데이터 전송 (전체 결과지 상세 내역 포함)
                        try {
                            // 영역별 점수 계산
                            const categoryScores: any = {};
                            Object.entries(CATEGORY_WEIGHTS).forEach(([cat, weight]) => {
                                if (weight === 0) return;
                                const actualScore = details[cat] || 0;
                                const actualMax = maxDetails[cat] || 1;
                                const weightedScore = actualMax > 0 
                                    ? Math.round((actualScore / actualMax) * weight)
                                    : 0;
                                categoryScores[cat] = {
                                    score: weightedScore,
                                    max: weight,
                                    percent: weight > 0 ? Math.round((weightedScore / weight) * 100) : 0
                                };
                            });

                            console.log('📧 이메일 전송 요청 시작...', {
                                phoneNumber,
                                total,
                                grade,
                                futureSelfPay,
                                agree1: chk1?.checked,
                                agree2: chk2?.checked,
                            });

                            const response = await fetch('/api/send-email', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    phoneNumber,
                                    total,
                                    grade,
                                    status,
                                    careType,
                                    // 2026년 현재 비용
                                    realGovSupport,
                                    coPay,
                                    nonCoveredCost,
                                    finalSelfPay,
                                    // 2036년 미래 비용
                                    futureTotalCost,
                                    futureGovSupport,
                                    futureSelfPay,
                                    futureDetails,
                                    // 영역별 상세 점수
                                    categoryScores,
                                    // 기타
                                    familyWarning,
                                    agree1: chk1?.checked,
                                    agree2: chk2?.checked,
                                }),
                            });

                            console.log('📧 API 응답 상태:', response.status, response.statusText);

                            const result = await response.json();
                            console.log('📧 API 응답 데이터:', result);
                            
                            if (result.success) {
                                alert(`✅ 신청이 완료되었습니다!\n\n📱 ${phoneNumber}\n\n📋 처리 안내:\n• 간병비 예상 견적서와 분석 자료를\n  문자로 보내드립니다\n• 전문 보험설계사가 1~2일 내\n  순차적으로 연락드립니다\n• 연락이 어려우시면 나중에\n  다시 신청해주세요\n\n감사합니다! 🙏`);
                            } else {
                                // 서버에서 반환한 에러 메시지 표시
                                const errorMsg = result.error || '알 수 없는 오류';
                                const details = result.details ? `\n\n상세: ${result.details}` : '';
                                const help = result.help ? `\n\n해결 방법: ${result.help}` : '';
                                alert(`❌ 이메일 전송 실패\n\n${errorMsg}${details}${help}`);
                            }
                        } catch (error: any) {
                            console.error('❌ 전송 오류:', error);
                            alert(`❌ 네트워크 오류가 발생했습니다.\n\n${error.message || '알 수 없는 오류'}\n\n개발자 도구 콘솔을 확인해주세요.`);
                        }
                    }} 
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-blue-900 py-3.5 rounded-xl font-black text-base shadow-lg transform active:scale-95 transition-all"
                >
                    내 보험 점검 & 무료 견적 받기 📩
                </button>
            </div>
            </div>
        </div>

        <button onClick={() => window.location.reload()} className="text-gray-400 underline py-4 text-sm mb-8">처음부터 다시 하기</button>
      </div>
    );
  }

  const q = QUIZ_QUESTIONS[step];

  return (
    <div className={`h-dvh bg-white flex flex-col max-w-md mx-auto shadow-2xl relative ${step >= QUIZ_QUESTIONS.length ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      {/* 1. 가이드 오버레이 */}
      {showGuide && (
        <GuideOverlay question={q} onStart={() => setShowGuide(false)} currentNum={q.id} totalNum={QUIZ_QUESTIONS.length} />
      )}

      {/* 2. 상단 진행바 */}
      <div className="h-2 bg-gray-100 w-full">
        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${((step + 1) / QUIZ_QUESTIONS.length) * 100}%` }}></div>
      </div>

      {/* 3. 문제 영역 */}
      {!showGuide && (
        <div className="flex-1 flex flex-col p-6 items-center space-y-6 overflow-y-auto pb-10">
          {/* 문제 번호 표시 */}
          <div className="w-full text-center mb-2">
            <span className="text-lg font-bold text-gray-500">문제 {q.id}/{QUIZ_QUESTIONS.length}</span>
          </div>
          <h2 className="text-2xl font-bold text-center whitespace-pre-line leading-relaxed text-gray-800">
            {q.questionText}
          </h2>

          <div className="w-full flex-1 flex flex-col justify-center">
            {/* --- 문제 유형별 렌더링 (Switch) --- */}
            {(() => {
              switch (q.type) {
                case 'memory-input':
                  return <MemoryInputGame correctAnswer={q.correctAnswer} onComplete={() => goNext('viewed')} />;
                
                case 'clock':
                  return (
                    <div className="w-full space-y-4">
                      <div className="text-center text-lg font-bold text-gray-700 mb-4">
                        아래 시계 중에서 <span className="text-red-600 text-xl">3시 45분</span>을 찾아주세요
                      </div>
                      <div className="grid grid-cols-2 gap-4 max-w-[350px] mx-auto">
                        {q.options?.map((option, idx) => {
                          const clockTimes = [
                            { hour: 3, minute: 45 },
                            { hour: 2, minute: 15 },
                            { hour: 9, minute: 15 },
                            { hour: 3, minute: 15 },
                          ];
                          const time = clockTimes[idx] || { hour: 3, minute: 45 };
                          const hourAngle = (time.hour % 12) * 30 + time.minute * 0.5;
                          const minuteAngle = time.minute * 6;
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => goNext(option)}
                              className="relative w-full flex flex-col items-center justify-center bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-md touch-manipulation active:scale-95 active:bg-green-50 active:border-green-500 aspect-square"
                            >
                              {/* 시계 */}
                              <div className="relative w-32 h-32 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-gray-400 bg-white"></div>
                                {/* 시계 숫자 표시 (12, 3, 6, 9) */}
                                <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs font-bold">12</div>
                                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs font-bold">3</div>
                                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-bold">6</div>
                                <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs font-bold">9</div>
                                {/* 시침 */}
                                <div
                                  className="absolute w-1 bg-gray-800 origin-bottom z-10"
                                  style={{
                                    height: '30%',
                                    transform: `rotate(${hourAngle}deg)`,
                                    transformOrigin: 'bottom center',
                                    bottom: '50%',
                                    left: '50%',
                                    marginLeft: '-2px',
                                  }}
                                ></div>
                                {/* 분침 */}
                                <div
                                  className="absolute w-0.5 bg-gray-800 origin-bottom z-10"
                                  style={{
                                    height: '40%',
                                    transform: `rotate(${minuteAngle}deg)`,
                                    transformOrigin: 'bottom center',
                                    bottom: '50%',
                                    left: '50%',
                                    marginLeft: '-1px',
                                  }}
                                ></div>
                                {/* 중심점 */}
                                <div className="absolute w-3 h-3 bg-gray-800 rounded-full z-20" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                
                case 'complex-calculation':
                case 'serial-subtraction':
                case 'choice':
                  return (
                    <div className="grid grid-cols-2 gap-4 w-full">
                      {q.options?.map((opt, i) => (
                        <button key={i} onClick={() => goNext(opt)} className="py-8 bg-white border-2 border-gray-200 rounded-2xl text-xl font-bold shadow-sm active:bg-green-50 active:border-green-500">
                          {opt}
                        </button>
                      ))}
                    </div>
                  );

                case 'stroop': return <StroopGame onAnswer={goNext} />;
                case 'symbol-count': return <SymbolCountGame onAnswer={goNext} />;
                case 'reverse-number-input': return <ReverseNumberGame correctAnswer={q.correctAnswer} onComplete={goNext} />;
                case 'reaction-speed': return <ReactionGame onComplete={goNext} />;
                case 'word-fluency': return <WordFluencyGame onComplete={() => goNext('done')} />;
                case 'whack-a-mole': return <WhackMoleGame onComplete={(acc, c, w) => goNext({acc, c, wro: w})} />;
                case 'card-match': return <CardGame onComplete={() => goNext('done')} />;
                case 'schulte-table': return <SchulteTableGame onComplete={(t) => goNext(t)} />;
                case 'pattern-logic': return <PatternLogicGame onComplete={() => goNext('done')} />;
                case 'multi-choice': return <MultiChoiceGame options={q.options || []} onComplete={(selected) => goNext(selected)} />;
                
                case 'family-care':
                    return (
                        <div className="grid grid-cols-1 gap-3 w-full">
                            {q.options?.map((opt, i) => (
                                <button key={i} onClick={() => goNext(opt)} className="py-6 border-2 rounded-2xl text-xl font-bold bg-white active:bg-gray-100">{opt}</button>
                            ))}
                        </div>
                    );

                default: return <div>Loading...</div>;
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { QUIZ_QUESTIONS, QuizQuestion, CategoryName, CATEGORIES, UserProfile, getNormalRange } from '../data/quizData';

type Step = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13; // -1: 인트로, 0-12: 문제(13개), 13: 결과

// 숫자 순차 표시 컴포넌트 (Q2용)
function ReverseNumberDisplay({ sequence }: { sequence: number[] }) {
  const [currentIndex, setCurrentIndex] = useState<number>(-2); // -2: 설명, -1: 준비, 0+: 숫자
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // 처음 3초: 설명 화면
    if (currentIndex === -2) {
      const timer = setTimeout(() => {
        setCurrentIndex(-1); // 준비 단계
      }, 3000);
      return () => clearTimeout(timer);
    }
    // 1초 대기 후 숫자 표시 시작
    if (currentIndex === -1) {
      const timer = setTimeout(() => {
        setCurrentIndex(0); // 첫 번째 숫자 표시 시작
      }, 1000);
      return () => clearTimeout(timer);
    }
    // 숫자 순차 표시
    if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000); // 1초마다 다음 숫자
      return () => clearTimeout(timer);
    } else if (currentIndex === sequence.length - 1) {
      const timer = setTimeout(() => {
        setIsComplete(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, sequence.length]);

  // 완료 후 입력 안내
  if (isComplete) {
    return (
      <div className="bg-gray-100 p-2 rounded-lg text-center min-h-[50px] flex items-center justify-center">
        <p className="text-sm text-gray-600">이제 숫자를 거꾸로 입력해주세요!</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-2 rounded-lg text-center min-h-[60px] flex items-center justify-center">
      {currentIndex === -2 && (
        <div className="space-y-0.5">
          <p className="text-base font-bold text-gray-800">숫자가 하나씩 나타납니다</p>
          <p className="text-sm text-gray-700">숫자를 <span className="text-[#EF6C00] font-bold">거꾸로</span> 기억해주세요!</p>
          <p className="text-xs text-gray-600 mt-1">곧 시작합니다...</p>
        </div>
      )}
      {currentIndex === -1 && (
        <p className="text-sm text-gray-600">준비하세요!</p>
      )}
      {currentIndex >= 0 && (
        <div className="text-4xl font-bold text-gray-800 animate-pulse">
          {sequence[currentIndex]}
        </div>
      )}
    </div>
  );
}

// 순발력 테스트 컴포넌트
function ReactionSpeedTest({ onComplete }: { onComplete: (reactionTime: number) => void }) {
  const [phase, setPhase] = useState<'waiting' | 'ready' | 'go' | 'result'>('waiting');
  const [startTime, setStartTime] = useState<number>(0);
  const [reactionTime, setReactionTime] = useState<number>(0);

  useEffect(() => {
    if (phase === 'waiting') {
      // 2~5초 랜덤 대기
      const waitTime = 2000 + Math.random() * 3000;
      const timer = setTimeout(() => {
        setPhase('ready');
      }, waitTime);
      return () => clearTimeout(timer);
    } else if (phase === 'ready') {
      // 0.5초 후 초록색으로 변경
      const timer = setTimeout(() => {
        setPhase('go');
        const now = Date.now();
        setStartTime(now);
      }, 500);
      return () => clearTimeout(timer);
    } else if (phase === 'result') {
      // 결과 표시 후 2초 뒤 자동으로 완료 처리
      const timer = setTimeout(() => {
        onComplete(reactionTime);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, reactionTime, onComplete]);

  const handleClick = () => {
    if (phase === 'go') {
      const endTime = Date.now();
      const time = endTime - startTime;
      setReactionTime(time);
      setPhase('result');
    } else if (phase === 'waiting' || phase === 'ready') {
      // 너무 빨리 클릭하면 다시 시작
      setPhase('waiting');
    }
  };

  const getReactionMessage = (time: number) => {
    if (time <= 300) return { text: '반사신경 20대! 🚀', color: 'text-green-600' };
    if (time <= 500) return { text: '반사신경 30-40대! 👍', color: 'text-blue-600' };
    if (time <= 800) return { text: '뇌 전달 속도가 느려지고 있어요... ⚠️', color: 'text-orange-600' };
    return { text: '전두엽 훈련이 시급합니다! 🚨', color: 'text-red-600' };
  };

  if (phase === 'result') {
    const message = getReactionMessage(reactionTime);
    return (
      <div className="space-y-4 text-center">
        <div className={`text-3xl font-bold ${message.color} p-6 rounded-2xl bg-gray-50`}>
          {message.text}
        </div>
        <div className="text-2xl text-gray-700">
          반응 속도: <span className="font-bold text-[#2E7D32]">{(reactionTime / 1000).toFixed(2)}초</span>
        </div>
        <p className="text-base text-gray-500">
          {reactionTime > 500 && '문제는 잘 푸셨지만, 반응 속도가 느리십니다. 전두엽 훈련이 필요합니다.'}
        </p>
        <p className="text-sm text-gray-400 mt-2">잠시 후 결과 화면으로 이동합니다...</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-[400px] flex items-center justify-center rounded-2xl transition-all duration-300 cursor-pointer ${
        phase === 'waiting' || phase === 'ready'
          ? 'bg-red-500 active:bg-red-600'
          : 'bg-green-500 animate-pulse'
      }`}
      onClick={handleClick}
    >
      <div className="text-center text-white">
        {phase === 'waiting' && (
          <>
            <div className="text-6xl mb-4">🔴</div>
            <p className="text-3xl font-bold mb-2">대기 중...</p>
            <p className="text-xl">초록색이 되면 즉시 터치하세요!</p>
          </>
        )}
        {phase === 'ready' && (
          <>
            <div className="text-6xl mb-4 animate-bounce">🟡</div>
            <p className="text-3xl font-bold mb-2">준비하세요!</p>
            <p className="text-xl">곧 초록색이 됩니다!</p>
          </>
        )}
        {phase === 'go' && (
          <>
            <div className="text-8xl mb-4">🟢</div>
            <p className="text-5xl font-bold animate-pulse">지금!!</p>
            <p className="text-2xl mt-4">터치하세요!</p>
          </>
        )}
      </div>
    </div>
  );
}

// 카드 짝 맞추기 게임 (업그레이드 버전: 5쌍, 시간제한, 시도횟수)
function CardMatchGame({ onComplete, timeLimit }: { onComplete: (isSuccess: boolean, attempts: number) => void; timeLimit: number }) {
  const [cards, setCards] = useState<{ id: number; icon: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [showWrong, setShowWrong] = useState(false);
  const [phase, setPhase] = useState<'memorize' | 'play' | 'complete'>('memorize');

  useEffect(() => {
    // 완료 상태면 더 이상 실행하지 않음
    if (phase === 'complete' || phase === 'play') return;
    
    // 5쌍 (10장) 카드 생성
    const icons = ['🍎', '🍌', '🍇', '🍊', '🍉'];
    const deck = [...icons, ...icons]
      .map((icon, index) => ({ id: index, icon, isFlipped: true, isMatched: false }))
      .sort(() => Math.random() - 0.5);
    
    setCards(deck);

    // 3초 동안 보여주고 다시 뒤집기
    const timer = setTimeout(() => {
      setCards(prev => prev.map(card => ({ ...card, isFlipped: false })));
      setPhase('play');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // 타이머
  useEffect(() => {
    if (phase === 'play' && timeLeft > 0 && matches < 5) { // 5쌍으로 변경
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            onComplete(false, attempts);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, timeLeft, matches, attempts, onComplete]);

  const handleCardClick = (index: number) => {
    if (phase !== 'play' || flippedIndices.length >= 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setAttempts(prev => prev + 1);
      const [first, second] = newFlipped;
      if (cards[first].icon === cards[second].icon) {
        // 정답!
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === first || i === second ? { ...c, isMatched: true } : c)));
          setFlippedIndices([]);
          setMatches(m => {
            const newMatches = m + 1;
            if (newMatches === 4) {
              setTimeout(() => {
                setPhase('complete');
                onComplete(true, attempts + 1);
              }, 500);
            }
            return newMatches;
          });
        }, 500);
      } else {
        // 땡! 다시 뒤집기
        setShowWrong(true);
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === first || i === second ? { ...c, isFlipped: false } : c)));
          setFlippedIndices([]);
          setShowWrong(false);
        }, 1000);
      }
    }
  };

  if (phase === 'memorize') {
    return (
      <div className="space-y-4 text-center">
        <div className="text-2xl font-bold text-gray-800 mb-2">카드를 3초 동안 기억하세요!</div>
        <div className="grid grid-cols-4 gap-2 max-w-[320px] mx-auto">
          {cards.map((card, index) => (
            <div
              key={index}
              className="h-20 text-4xl rounded-xl bg-white shadow-lg flex items-center justify-center animate-pulse"
            >
              {card.icon}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl mb-2">🎉</div>
        <div className="text-2xl font-bold text-[#2E7D32]">성공!</div>
        <div className="text-base text-gray-600">시도 횟수: {attempts}회</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-2">
        <div className="text-lg font-bold text-gray-700">
          맞춘 짝: {matches}/5
        </div>
        <div className={`text-lg font-bold ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
          ⏱ {timeLeft}초
        </div>
      </div>
      {showWrong && (
        <div className="text-center text-4xl font-bold text-red-600 animate-bounce">
          땡! ❌
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 max-w-[320px] mx-auto">
        {cards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(index)}
            disabled={card.isMatched}
            className={`h-20 text-4xl rounded-xl transition-all duration-300 transform shadow-lg flex items-center justify-center touch-manipulation ${
              card.isFlipped || card.isMatched
                ? 'bg-white rotate-y-180 scale-105'
                : 'bg-[#EF6C00] rotate-y-0 active:scale-95'
            } ${card.isMatched ? 'opacity-50' : ''}`}
          >
            {card.isFlipped || card.isMatched ? card.icon : '❓'}
          </button>
        ))}
      </div>
      <div className="text-center text-sm text-gray-600">
        시도 횟수: {attempts}회
      </div>
    </div>
  );
}

// 슐테 테이블 게임 (업그레이드 버전: 4x4, 16개, 시간제한, 힌트 기능)
function SchulteTableGame({ onComplete, timeLimit }: { onComplete: (time: number, isSuccess: boolean) => void; timeLimit: number }) {
  // 숫자 배열을 한 번만 생성하고 고정 (useState 초기값으로)
  const [numbers] = useState<number[]>(() => {
    // 컴포넌트가 처음 마운트될 때만 실행
    return Array.from({ length: 16 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  });
  
  const [currentNum, setCurrentNum] = useState(1);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [wrongClick, setWrongClick] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const start = Date.now();
    setStartTime(start);
    
    // 타이머 (1초마다 감소)
    const timer = setInterval(() => {
      if (isComplete) {
        clearInterval(timer);
        return;
      }
      
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsComplete(true);
          onComplete(timeLimit, false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLimit, isComplete, onComplete]);

  // 힌트 기능 제거 (난이도 상승)

  const handleNumClick = (num: number) => {
    if (isComplete) return;
    
    if (num === currentNum) {
      // 정답을 누름
      // 힌트 제거 (난이도 상승)
      
      if (num === 16) {
        // 끝! (16까지 다 찾음)
        setIsComplete(true);
        onComplete((Date.now() - startTime) / 1000, true);
      } else {
        // 다음 숫자로 이동
        setCurrentNum(n => n + 1);
        // 힌트 기능 제거
      }
    } else {
      // 틀린 숫자 누름
      setWrongClick(true);
      setTimeout(() => setWrongClick(false), 300);
    }
  };

  return (
    <div className="space-y-3 text-center">
      <div className="text-xl font-bold text-gray-700">
        찾아야 할 숫자: <span className="text-4xl text-[#2E7D32] inline-block font-black animate-bounce">{currentNum}</span>
      </div>
      {/* 힌트 제거 (난이도 상승) */}
      {wrongClick && (
        <div className="text-2xl font-bold text-red-600 animate-bounce">
          ❌ 틀렸어요!
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5 max-w-[280px] mx-auto bg-gray-200 p-2 rounded-xl">
        {numbers.map((num, index) => {
          return (
            <button
              key={`${num}-${index}`}
              onClick={() => handleNumClick(num)}
              disabled={isComplete || num < currentNum}
              className={`h-16 text-xl font-bold rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center touch-manipulation ${
                num < currentNum 
                  ? 'invisible' // 이미 찾은 숫자는 숨김
                  : 'bg-white text-gray-800 hover:bg-gray-50' // 힌트 제거 (난이도 상승)
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
      <div className="text-sm text-gray-600">
        진행: {currentNum - 1}/16
      </div>
    </div>
  );
}

// ============================================================================
// [최종 완성] 두더지 잡기 (끊김 해결 + 가끔 2마리 동시 출현)
// ============================================================================
function WhackAMoleGame({ onComplete, timeLimit }: { onComplete: (accuracy: number, correctHits: number, wrongHits: number) => void; timeLimit: number }) {
  const [phase, setPhase] = useState<'instruction' | 'playing' | 'complete'>('instruction');
  const [moles, setMoles] = useState<{ id: number; color: 'red' | 'blue'; position: number }[]>([]);
  const [score, setScore] = useState({ correct: 0, wrong: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  // 게임 시작
  const startGame = () => {
    setPhase('playing');
    setTimeLeft(timeLimit);
  };

  // 1. [타이머 로직]
  useEffect(() => {
    if (phase !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // 2. [두더지 생성 로직] - 멀티 스폰 기능 추가!
  useEffect(() => {
    if (phase !== 'playing') return;

    // 0.7 ~ 1.1초마다 생성
    const spawnRate = 700 + Math.random() * 400; 

    const spawner = setInterval(() => {
      setMoles(prevMoles => {
        // 꽉 찼으면 생성 안 함
        if (prevMoles.length >= 9) return prevMoles;

        // 현재 비어있는 자리 찾기
        const occupiedPositions = prevMoles.map(m => m.position);
        const availablePositions = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
          p => !occupiedPositions.includes(p)
        );

        if (availablePositions.length === 0) return prevMoles;

        // ★ 핵심 로직: 30% 확률로 2마리, 70% 확률로 1마리 생성
        // 단, 빈 자리가 2개 이상일 때만 2마리 생성 가능
        const spawnCount = (Math.random() < 0.3 && availablePositions.length >= 2) ? 2 : 1;
        
        const newMoles: { id: number; color: 'red' | 'blue'; position: number }[] = [];

        for (let i = 0; i < spawnCount; i++) {
          // 남은 자리 중 랜덤 선택
          const randomIndex = Math.floor(Math.random() * availablePositions.length);
          const position = availablePositions[randomIndex];
          
          // 선택된 자리는 목록에서 제거 (중복 방지)
          availablePositions.splice(randomIndex, 1);

          const color: 'red' | 'blue' = Math.random() < 0.7 ? 'red' : 'blue';
          // id에 i를 더해서 고유값 보장
          const id = Date.now() + Math.random() + i; 

          newMoles.push({ id, color, position });
        }
        
        return [...prevMoles, ...newMoles];
      });
    }, spawnRate);

    // 3. [자동 사라짐 로직] - 1.3초 뒤 사라짐
    const cleaner = setInterval(() => {
        const now = Date.now();
        setMoles(prevMoles => prevMoles.filter(m => now - Math.floor(m.id) < 1300));
    }, 100);

    return () => { 
        clearInterval(spawner); 
        clearInterval(cleaner);
    };
  }, [phase]);

  // 4. [게임 종료 처리]
  useEffect(() => {
    if (phase === 'complete') {
        const accuracy = score.total > 0 ? (score.correct / score.total) * 100 : 0;
        const timer = setTimeout(() => onComplete(accuracy, score.correct, score.wrong), 1500);
        return () => clearTimeout(timer);
    }
  }, [phase, score, onComplete]);

  const handleWhack = (mole: { id: number; color: 'red' | 'blue' }) => {
    if (phase !== 'playing') return;
    
    const isCorrect = mole.color === 'red';
    setScore(prev => ({ 
        correct: prev.correct + (isCorrect ? 1 : 0), 
        wrong: prev.wrong + (isCorrect ? 0 : 1),
        total: prev.total + 1 
    }));

    setMoles(prev => prev.filter(m => m.id !== mole.id));
  };

  if (phase === 'instruction') {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 border-2 border-red-300 bg-red-50 rounded-xl">
          <p className="text-2xl">🐻 <span className="text-red-600 font-bold">빨강</span> = 터치!</p>
        </div>
        <div className="p-4 border-2 border-blue-300 bg-blue-50 rounded-xl">
          <p className="text-2xl">🐻 <span className="text-blue-600 font-bold">파랑</span> = 무시!</p>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          가끔 두 마리가 동시에 나오기도 해요! 👀
        </div>
        <button onClick={startGame} className="w-full bg-[#2E7D32] text-white py-3 rounded-xl font-bold mt-2">게임 시작</button>
      </div>
    );
  }

  if (phase === 'complete') {
      return <div className="text-center text-3xl font-bold text-gray-700 py-10">게임 종료!</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-4 font-bold text-lg text-gray-700">
         <div>점수: {score.correct}</div>
         <div className={timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}>남은 시간: {timeLeft}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto select-none">
        {Array.from({ length: 9 }).map((_, idx) => {
          const mole = moles.find(m => m.position === idx);
          return (
            <div key={idx} className="h-24 bg-gray-200 rounded-xl relative overflow-hidden shadow-inner">
              {mole && (
                <button
                  onPointerDown={() => handleWhack(mole)}
                  className={`w-full h-full text-5xl flex items-center justify-center animate-bounce touch-manipulation ${
                    mole.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                >
                  🐻
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 애니메이션 숫자 컴포넌트 (간병비 표시용)
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2초 동안 애니메이션
    const steps = 60;
    const increment = value / steps;
    const stepDuration = duration / steps;
    
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
}

interface GameState {
  currentStep: Step;
  answers: Record<number, string | string[] | number[]>;
  memoryItems: string[];
  userProfile: UserProfile;
  phoneNumber: string;
  timeRemaining?: number; // 타이머
  showingBreak?: boolean; // 휴식 메시지 표시 중
  reactionTime?: number; // 반응 속도 (ms)
  schulteTime?: number; // 슐테 테이블 완료 시간 (초)
  cardAttempts?: number; // 카드 짝 맞추기 시도 횟수
  reverseNumberSequence?: number[]; // 숫자 거꾸로 문제의 랜덤 시퀀스
  whackAccuracy?: number; // 두더지 게임 정확도 (%)
}

const TOTAL_QUESTIONS = QUIZ_QUESTIONS.length;

export default function Home() {
  const [gameState, setGameState] = useState<GameState>({
    currentStep: -1,
    answers: {},
    memoryItems: [],
    userProfile: { gender: '', age: 0 },
    phoneNumber: '',
    timeRemaining: undefined,
    showingBreak: false,
    reactionTime: undefined,
    schulteTime: undefined,
    cardAttempts: undefined,
    reverseNumberSequence: undefined,
    whackAccuracy: undefined,
  });


  // 타이머 관리
  useEffect(() => {
    if (gameState.currentStep >= 0 && gameState.currentStep < TOTAL_QUESTIONS) {
      const question = QUIZ_QUESTIONS[gameState.currentStep];
      
      // 가족부양질문과 두더지 잡기 게임은 위쪽 타이머 사용 안 함
      // - 가족부양질문: 제한시간 없음, 클릭해야만 넘어감
      // - 두더지 잡기: 게임 내부 타이머 사용 (게임 시작 후부터 시작)
      if (question.type === 'family-care' || question.type === 'whack-a-mole') {
        setGameState((prev) => ({ ...prev, timeRemaining: undefined }));
        return;
      }
      
      if (question.timeLimit) {
        setGameState((prev) => ({ ...prev, timeRemaining: question.timeLimit }));
        
        const timer = setInterval(() => {
          setGameState((prev) => {
            if (prev.timeRemaining === undefined || prev.timeRemaining <= 0) {
              clearInterval(timer);
              // 시간 초과 시 자동으로 다음 문제로
              if (prev.timeRemaining === 0) {
                setTimeout(() => handleNextStep(), 1000);
              }
              return prev;
            }
            return { ...prev, timeRemaining: prev.timeRemaining - 1 };
          });
        }, 1000);

        return () => clearInterval(timer);
      } else {
        setGameState((prev) => ({ ...prev, timeRemaining: undefined }));
      }
    }
  }, [gameState.currentStep]);

  // Q1 (기억 입력): 3초 후 자동 이동
  useEffect(() => {
    if (gameState.currentStep === 0) {
      const timer = setTimeout(() => {
        handleNextStep();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentStep]);

  // Q3 (숫자 거꾸로): 랜덤 숫자 시퀀스 생성
  useEffect(() => {
    if (gameState.currentStep === 2) { // Q3은 currentStep 2
      const question = QUIZ_QUESTIONS[2];
      if (question.type === 'reverse-number-input' && !gameState.reverseNumberSequence) {
        // 여러 5자리 숫자 조합 중 랜덤 선택
        const sequences = [
          [9, 4, 8, 3, 7], // 거꾸로: 7-3-8-4-9
          [2, 5, 1, 6, 9], // 거꾸로: 9-6-1-5-2
          [3, 7, 2, 8, 4], // 거꾸로: 4-8-2-7-3
          [6, 1, 9, 3, 5], // 거꾸로: 5-3-9-1-6
          [4, 8, 1, 7, 2], // 거꾸로: 2-7-1-8-4
          [5, 2, 9, 6, 3], // 거꾸로: 3-6-9-2-5
          [7, 3, 5, 1, 8], // 거꾸로: 8-1-5-3-7
          [1, 6, 4, 9, 2], // 거꾸로: 2-9-4-6-1
          [8, 2, 6, 4, 1], // 거꾸로: 1-4-6-2-8
          [3, 9, 5, 2, 7], // 거꾸로: 7-2-5-9-3
          [6, 4, 8, 1, 5], // 거꾸로: 5-1-8-4-6
          [2, 7, 3, 9, 4], // 거꾸로: 4-9-3-7-2
          [5, 1, 7, 4, 6], // 거꾸로: 6-4-7-1-5
          [9, 3, 6, 2, 8], // 거꾸로: 8-2-6-3-9
          [4, 7, 1, 5, 9], // 거꾸로: 9-5-1-7-4
        ];
        
        const randomSequence = sequences[Math.floor(Math.random() * sequences.length)];
        
        setGameState((prev) => {
          // 기존 답변 제거를 위해 해당 키를 제외한 새 객체 생성
          const { [question.id]: _, ...restAnswers } = prev.answers;
          return {
            ...prev,
            reverseNumberSequence: randomSequence,
            answers: restAnswers,
          };
        });
        
        // 정답을 quizData에 동적으로 업데이트 (실제로는 gameState에서 관리)
        // calculateScores에서 gameState.reverseNumberSequence를 사용하도록 수정 필요
      }
    }
  }, [gameState.currentStep]);


  const handleNextStep = () => {
    setGameState((prev) => {
      // 인트로 화면(currentStep = -1)에서 시작하기 버튼을 누르면 첫 번째 문제(Q1)로 이동
      if (prev.currentStep === -1) {
        return { ...prev, currentStep: 0, showingBreak: false };
      }

      // 이미 결과 화면이면 무시
      if (prev.currentStep >= TOTAL_QUESTIONS) {
        return prev;
      }

      // 현재 문제 확인
      if (prev.currentStep < 0 || prev.currentStep >= TOTAL_QUESTIONS) {
        return prev;
      }
      
      const currentQuestion = QUIZ_QUESTIONS[prev.currentStep];
      if (!currentQuestion) {
        return prev;
      }
      
      // 가족부양질문은 확인 버튼을 통해서만 넘어가야 함 (자동 진행 방지)
      if (currentQuestion.type === 'family-care') {
        return prev;
      }
      
      const nextStep = (prev.currentStep + 1) as Step;
      
      // 다음 문제가 가족부양질문(Q13)인지 확인
      const nextQuestion = QUIZ_QUESTIONS[nextStep];
      const isNextFamilyCare = nextQuestion?.type === 'family-care';
      
      // 첫 번째 문제 이후부터 마지막 문제 전까지 휴식 메시지 표시
      // 단, 다음 문제가 가족부양질문이면 휴식 없이 바로 표시
      if (prev.currentStep > 0 && prev.currentStep < TOTAL_QUESTIONS - 1 && !prev.showingBreak && !isNextFamilyCare) {
        // 휴식 메시지 표시 후 2초 후 다음 문제로
        const capturedNextStep = nextStep;
        setTimeout(() => {
          setGameState((p) => {
            // 휴식 중이고 currentStep이 변경되지 않았으면 다음 문제로 이동
            if (p.showingBreak && p.currentStep === prev.currentStep) {
              return { 
                ...p, 
                showingBreak: false, 
                currentStep: capturedNextStep 
              };
            }
            return p;
          });
        }, 2000);
        
        return { ...prev, showingBreak: true };
      }
      
      // 첫 번째 문제(Q1) 완료 후 바로 Q2로, 또는 가족부양질문 바로 전
      return { ...prev, currentStep: nextStep, showingBreak: false };
    });
  };

  const handleAnswer = (questionId: number, answer: string | string[] | number[]) => {
    setGameState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }));

    const question = QUIZ_QUESTIONS[questionId - 1];
    if (!question) return;
    
    if (question.type === 'memory-input') {
      setGameState((prev) => ({
        ...prev,
        memoryItems: answer as string[],
      }));
    }

    // ★ 수정: 게임 타입들은 handleAnswer에서 자동 넘김을 하지 않음
    // 게임 타입들은 컴포넌트의 onComplete에서 handleNextStep을 호출함
    // 자동 넘김이 필요한 타입들만 여기서 처리
    if (
      question.type === 'choice' ||
      question.type === 'stroop' ||
      question.type === 'time-calculation' ||
      question.type === 'complex-calculation' ||
      question.type === 'symbol-count' ||
      question.type === 'serial-subtraction'
    ) {
      setTimeout(() => {
        handleNextStep();
      }, 800);
    }
    
    // 게임 타입들과 가족부양질문은 컴포넌트 내부에서 처리 (onComplete에서 handleNextStep 호출)
    // handleAnswer에서는 답변만 저장하고 자동 진행하지 않음
  };

  const handleMultipleSelect = (questionId: number, option: string) => {
    const currentAnswers = (gameState.answers[questionId] || []) as string[];
    const newAnswers = currentAnswers.includes(option)
      ? currentAnswers.filter((a) => a !== option)
      : [...currentAnswers, option];

    setGameState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: newAnswers },
    }));
  };

  // [최종 수정] 사용자 요청 맞춤형 정밀 채점 로직
  const calculateScores = () => {
    // 1. 점수통 초기화
    const categoryScores: Record<CategoryName, number> = {
      기억력: 0, 지남력: 0, 계산력: 0, 시공간: 0, 집행기능: 0, 
      판단력: 0, 작업기억: 0, 억제능력: 0, 주의력: 0
    };

    const categoryMaxScores: Record<CategoryName, number> = {
      기억력: 0, 지남력: 0, 계산력: 0, 시공간: 0, 집행기능: 0, 
      판단력: 0, 작업기억: 0, 억제능력: 0, 주의력: 0
    };

    let correctCount = 0;

    // 2. 채점 루프 시작
    QUIZ_QUESTIONS.forEach((q) => {
      const ans = gameState.answers[q.id];
      const maxPoints = q.score;
      let earnedPoints = 0;

      // 만점(분모) 누적
      categoryMaxScores[q.category] += maxPoints;

      if (!ans) return;

      // -----------------------------------------------------------
      // ⚡ [게임 1] 반응 속도: 기준 완화 (0.4초 만점 / 0.05초당 감점)
      // -----------------------------------------------------------
      if (q.type === 'reaction-speed') {
        if (ans === 'completed') {
          const time = gameState.reactionTime || 9999;
          
          // 기존 300ms -> 400ms로 완화 (어르신 고려)
          const baseTime = 400; 
          // 0.05초(50ms) 늦을 때마다 -1점
          const penaltyStep = 50; 
          
          if (time <= baseTime) {
            earnedPoints = maxPoints;
          } else {
            const delay = time - baseTime;
            const penalty = Math.ceil(delay / penaltyStep);
            earnedPoints = Math.max(0, maxPoints - penalty);
          }
          if (earnedPoints > 0) correctCount++;
        }
      }
      
      // -----------------------------------------------------------
      // 🔢 [게임 2] 슐테 테이블: 18초 기준 / 1초당 -1점 (요청 반영)
      // -----------------------------------------------------------
      else if (q.type === 'schulte-table') {
        if (ans === 'completed') {
          const time = gameState.schulteTime || 999;
          const baseTime = 18; // 18초 이내 만점
          
          if (time <= baseTime) {
            earnedPoints = maxPoints;
          } else {
            // 1초 늦을 때마다 -1점 (소수점 올림 처리)
            const delay = time - baseTime;
            const penalty = Math.ceil(delay); // 1.1초 늦으면 2점 감점
            earnedPoints = Math.max(0, maxPoints - penalty);
          }
          if (earnedPoints > 0) correctCount++;
        } else {
            // 시간 내 못 찾았거나 실패 시 0점
            earnedPoints = 0;
        }
      }

      // -----------------------------------------------------------
      // 🃏 [게임 3] 카드 짝 맞추기: 5회 만점 / 1회당 -1점 (요청 반영)
      // -----------------------------------------------------------
      else if (q.type === 'card-match') {
        // 시간 내 완료('completed') 못하면 무조건 0점
        if (ans === 'completed') {
          const attempts = gameState.cardAttempts || 20;
          const baseAttempts = 5; // 5회(최소) 만점
          
          if (attempts <= baseAttempts) {
            earnedPoints = maxPoints;
          } else {
            // 6회부터 -1점씩 차감
            // (6회: -1, 7회: -2, 8회: -3 ...)
            const extraMoves = attempts - baseAttempts;
            earnedPoints = Math.max(0, maxPoints - extraMoves); 
          }
          if (earnedPoints > 0) correctCount++;
        } else {
            earnedPoints = 0; // 시간 초과
        }
      }

      // -----------------------------------------------------------
      // 🐻 [게임 4] 두더지 잡기: 정확도 % 그대로 점수 반영
      // -----------------------------------------------------------
      else if (q.type === 'whack-a-mole') {
        if (ans === 'completed') {
          const accuracy = gameState.whackAccuracy || 0; // 0~100
          earnedPoints = Math.round(maxPoints * (accuracy / 100));
          if (earnedPoints > 0) correctCount++;
        }
      }

      // -----------------------------------------------------------
      // 🔄 [문제] 숫자 거꾸로: 맞춘 숫자 개수만큼 부분 점수
      // -----------------------------------------------------------
      else if (q.type === 'reverse-number-input') {
        if (Array.isArray(ans) && Array.isArray(q.correctAnswer)) {
          const sequence = gameState.reverseNumberSequence || [9, 4, 8, 3, 7];
          const correctSeq = [...sequence].reverse();
          
          let matchCount = 0;
          correctSeq.forEach((val, idx) => {
            if (val === (ans as number[])[idx]) matchCount++;
          });

          earnedPoints = Math.round(maxPoints * (matchCount / correctSeq.length));
          if (earnedPoints === maxPoints) correctCount++;
        }
      }

      // -----------------------------------------------------------
      // 🖼️ [문제] 지연 회상: 1개당 33% 점수 (부분 점수)
      // -----------------------------------------------------------
      else if (q.type === 'multi-choice') {
        if (Array.isArray(ans) && Array.isArray(q.correctAnswer)) {
          const correctList = q.correctAnswer as string[];
          const userList = ans as string[];
          const matchCount = correctList.filter(item => userList.includes(item)).length;

          earnedPoints = Math.round(maxPoints * (matchCount / 3));
          if (matchCount === 3) correctCount++;
        }
      }

      // -----------------------------------------------------------
      // 📝 [기타] 일반 객관식 (모 아니면 도)
      // -----------------------------------------------------------
      else if (q.type !== 'family-care') { 
        // 배열 타입 정답 처리
        if (Array.isArray(q.correctAnswer)) {
          if (Array.isArray(ans)) {
            const correctAnswers = q.correctAnswer as string[] | number[];
            const userAnswers = ans as string[] | number[];
            const isCorrect = correctAnswers.length === userAnswers.length &&
              correctAnswers.every((a, idx) => a === userAnswers[idx]);
            if (isCorrect) {
              earnedPoints = maxPoints;
              correctCount++;
            } else {
              earnedPoints = 0;
            }
          } else {
            earnedPoints = 0;
          }
        } else {
          // 문자열 비교
          const answerStr = String(ans).trim();
          const correctStr = String(q.correctAnswer).trim();
          
          if (answerStr === correctStr) {
            earnedPoints = maxPoints;
            correctCount++;
          } else {
            earnedPoints = 0;
          }
        }
      }

      // 3. 점수 반영
      categoryScores[q.category] += earnedPoints;
    });

    // 4. 총점 합산
    const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
    const maxScore = Object.values(categoryMaxScores).reduce((a, b) => a + b, 0);

    return { categoryScores, categoryMaxScores, totalScore, maxScore, correctCount };
  };

  // 카테고리별 상세 피드백 메시지 (틀린 문제의 해답 포함)
  const getCategoryFeedback = (category: CategoryName, percent: number, score: number, max: number): { message: string; solution?: string } | null => {
    if (percent >= 80) return null; // 정상 범위면 피드백 없음

    // 해당 카테고리의 틀린 문제 찾기
    const wrongQuestions = QUIZ_QUESTIONS.filter(q => {
      if (q.category !== category) return false;
      const answer = gameState.answers[q.id];
      if (!answer) return false;
      
      // 정답 여부 확인
      if (q.type === 'reverse-number-input') {
        if (Array.isArray(answer) && answer.length === 5) {
          const sequence = gameState.reverseNumberSequence || [9, 4, 8, 3, 7];
          const correctAnswer = [...sequence].reverse();
          return !correctAnswer.every((val, idx) => val === (answer as number[])[idx]);
        }
        return true;
      } else if (q.type === 'multi-choice') {
        if (Array.isArray(answer) && Array.isArray(q.correctAnswer)) {
          const correct = (q.correctAnswer as string[]).filter(a => (answer as string[]).includes(a)).length;
          return correct < 3;
        }
        return true;
      } else if (['card-match', 'schulte-table', 'whack-a-mole', 'reaction-speed'].includes(q.type)) {
        return answer !== 'completed';
      } else {
        const answerStr = String(answer).trim();
        const correctStr = String(q.correctAnswer).trim();
        return answerStr !== correctStr;
      }
    });

    const feedbacks: Record<CategoryName, (p: number, wrongQ?: QuizQuestion) => { message: string; solution?: string }> = {
      작업기억: (p, wrongQ) => {
        if (p < 60 && wrongQ) {
          if (wrongQ.type === 'reverse-number-input') {
            const sequence = gameState.reverseNumberSequence || [9, 4, 8, 3, 7];
            const userAnswer = gameState.answers[wrongQ.id] as number[];
            const correctAnswer = [...sequence].reverse();
            return {
              message: '숫자 거꾸로 문제를 틀리셨네요. 작업기억은 치매 초기 단계에서 가장 먼저 무너지는 부분입니다. 전문의 상담을 권장합니다.',
              solution: `📝 해답: 보신 숫자는 [${sequence.join('-')}]이고, 거꾸로 입력하면 [${correctAnswer.join('-')}]입니다. ${userAnswer ? `입력하신 답: [${userAnswer.join('-')}]` : ''}`
            };
          }
        }
        return { message: '작업기억력이 평균보다 낮습니다. 뇌 건강 관리가 필요합니다.' };
      },
      억제능력: (p, wrongQ) => {
        if (p < 60) {
          return {
            message: '색깔과 글자 간섭 문제는 전두엽 기능을 보는 핵심 검사입니다. 전두엽 기능 저하는 치매 초기 증상일 수 있습니다.',
            solution: '📝 해답: "노랑"이라는 글자가 파란색으로 표시되어 있으므로, 글자 내용이 아닌 색깔인 "파랑"이 정답입니다.'
          };
        }
        return { message: '억제능력이 평균보다 낮습니다. 집중력 훈련을 추천합니다.' };
      },
      계산력: (p, wrongQ) => {
        if (p < 60 && wrongQ) {
          if (wrongQ.type === 'serial-subtraction') {
            const userAnswer = gameState.answers[wrongQ.id];
            return {
              message: '연속 뺄셈 문제를 틀리셨네요. 계산력 저하는 인지 기능 저하의 신호일 수 있습니다.',
              solution: `📝 해답: 첫 번째 100-7=93, 두 번째 93-7=86, 세 번째 86-7=79. 정답은 79입니다. ${userAnswer ? `입력하신 답: ${userAnswer}` : ''}`
            };
          } else if (wrongQ.type === 'complex-calculation') {
            const userAnswer = gameState.answers[wrongQ.id];
            return {
              message: '복합 계산 문제를 틀리셨네요. 계산력 저하는 인지 기능 저하의 신호일 수 있습니다.',
              solution: `📝 해답: ${wrongQ.questionText} 정답은 ${wrongQ.correctAnswer}입니다. ${userAnswer ? `입력하신 답: ${userAnswer}` : ''}`
            };
          }
        }
        return { message: '계산력이 평균보다 낮습니다. 두뇌 운동을 꾸준히 해보세요.' };
      },
      기억력: (p, wrongQ) => {
        if (p < 60 && wrongQ) {
          if (wrongQ.type === 'multi-choice' && wrongQ.id === 9) {
            const userAnswer = gameState.answers[wrongQ.id] as string[];
            const correctAnswer = wrongQ.correctAnswer as string[];
            return {
              message: '지연 회상 문제를 틀리셨습니다. 기억력 저하는 치매의 가장 흔한 초기 증상입니다. 전문의 상담이 필요합니다.',
              solution: `📝 해답: 처음에 보신 그림 3개는 ${correctAnswer.join(', ')}입니다. ${userAnswer ? `입력하신 답: ${userAnswer.join(', ')}` : ''}`
            };
          }
        }
        return { message: '기억력이 평균보다 낮습니다. 규칙적인 뇌 건강 관리가 필요합니다.' };
      },
      지남력: () => ({ message: '지남력이 평균보다 낮습니다. 일상생활 주의가 필요합니다.' }),
      시공간: () => ({ message: '시공간 능력이 평균보다 낮습니다.' }),
      집행기능: () => ({ message: '집행기능이 평균보다 낮습니다.' }),
      판단력: () => ({ message: '판단력이 평균보다 낮습니다.' }),
      주의력: (p, wrongQ) => {
        if (p < 60 && wrongQ) {
          if (wrongQ.type === 'symbol-count') {
            const userAnswer = gameState.answers[wrongQ.id];
            return {
              message: '기호 찾기 문제를 틀리셨네요. 주의력 저하는 치매 초기 증상일 수 있습니다. 전문의 상담을 권장합니다.',
              solution: `📝 해답: 세잎클로버♣️는 총 7개입니다. (네잎클로버🍀는 제외) ${userAnswer ? `입력하신 답: ${userAnswer}` : ''}`
            };
          }
        }
        return { message: '주의력이 평균보다 낮습니다. 집중력 훈련을 추천합니다.' };
      },
    };

    const wrongQ = wrongQuestions[0]; // 첫 번째 틀린 문제
    return feedbacks[category]?.(percent, wrongQ) || null;
  };

  const getBrainAge = (score: number): string => {
    const percentage = (score / 100) * 100;
    if (percentage >= 90) return '20대';
    if (percentage >= 70) return '30대';
    if (percentage >= 50) return '40대';
    if (percentage >= 30) return '50대';
    return '60대 이상';
  };

  const getBrainAgeMessage = (score: number, correctCount: number): string => {
    const percentage = (score / 100) * 100;
    if (percentage >= 90) return '뇌 나이 20대! 아주 건강하세요! 💚';
    if (percentage >= 70) return '뇌 나이 30대! 정말 좋아요! 😊';
    if (percentage >= 50) return '뇌 나이 40대! 괜찮으세요! 👍';
    if (percentage >= 30) return '뇌 나이 50대! 조금 더 노력해봐요! 💪';
    
    // 낮은 점수일 때 Hook 멘트
    return `7문제 중 ${correctCount}개를 맞추셨네요! 깜빡하는 증상이 보입니다. 더 늦기 전에 대비책을 마련하세요. 💛`;
  };

  const renderProgressBar = () => {
    if (gameState.currentStep === -1 || gameState.currentStep >= TOTAL_QUESTIONS) return null;
    const progress = ((gameState.currentStep + 1) / (TOTAL_QUESTIONS + 1)) * 100;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 sm:h-4 mb-2 sm:mb-4 flex-shrink-0">
        <div
          className="bg-[#2E7D32] h-2 sm:h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };

  const getGreetingMessage = (age: number) => {
    // 나이가 입력되지 않았을 때는 중립적인 메시지
    if (!age || age === 0) {
      return {
        title: '건강한 뇌를 위한',
        subtitle: '간단한 테스트를 함께',
      };
    }
    
    if (age >= 60) {
      return {
        title: '어르신의 건강한 뇌를 위한',
        subtitle: '간단한 게임을 함께',
      };
    } else if (age >= 50) {
      return {
        title: '건강한 뇌를 위한',
        subtitle: '간단한 테스트를 함께',
      };
    } else if (age >= 40) {
      return {
        title: '건강한 뇌를 위한',
        subtitle: '간단한 체크를 함께',
      };
    } else {
      // 30대 이하
      return {
        title: '건강한 뇌를 위한',
        subtitle: '간단한 체크를 함께',
      };
    }
  };

  const renderQuestion = () => {
    // 인트로 화면
    if (gameState.currentStep === -1) {
      const greeting = getGreetingMessage(gameState.userProfile.age);
      
      return (
        <div className="flex flex-col items-center justify-center h-full p-3 sm:p-6 space-y-2 sm:space-y-4 bg-gradient-to-b from-green-50 to-orange-50 overflow-y-auto">
          <div className="mb-2 sm:mb-4 animate-bounce flex-shrink-0">
            <div className="text-5xl sm:text-8xl">🐻</div>
          </div>
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg w-full flex-shrink-0">
            <div className="text-center mb-4 sm:mb-6 space-y-2 sm:space-y-3">
              <h1 className="text-2xl sm:text-4xl font-bold text-[#2E7D32]">안녕하세요!</h1>
              <p className="text-xl sm:text-3xl text-gray-800">
                저는 <span className="text-[#EF6C00] font-bold">닥터 든든이</span>예요! 👋
              </p>
              <div className="text-base sm:text-2xl text-gray-600 leading-relaxed space-y-0.5 sm:space-y-1">
                <p>{greeting.title}</p>
                <p>{greeting.subtitle}</p>
                <p>시작해볼까요?</p>
              </div>
            </div>

            {/* 성별/연령 입력 */}
            <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
              <div>
                <p className="text-sm sm:text-xl text-gray-700 mb-1 sm:mb-2">나이를 입력해주세요 (선택사항)</p>
                <p className="text-xs sm:text-base text-gray-500 mb-2 sm:mb-3 text-center">
                  나이를 입력하시면 더 정확한 분석이 가능해요
                </p>
                <input
                  type="number"
                  value={gameState.userProfile.age || ''}
                  onChange={(e) => {
                    const age = parseInt(e.target.value) || 0;
                    setGameState((prev) => ({
                      ...prev,
                      userProfile: { ...prev.userProfile, age },
                    }));
                  }}
                  placeholder="예: 55"
                  min="30"
                  max="100"
                  className="w-full h-12 sm:h-16 px-3 sm:px-4 text-lg sm:text-2xl border-2 border-gray-300 rounded-xl focus:border-[#2E7D32] focus:outline-none text-center"
                />
              </div>
              <div>
                <p className="text-sm sm:text-xl text-gray-700 mb-1 sm:mb-2">성별을 선택해주세요 (선택사항)</p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() =>
                      setGameState((prev) => ({
                        ...prev,
                        userProfile: { ...prev.userProfile, gender: 'male' },
                      }))
                    }
                    className={`h-12 sm:h-16 text-lg sm:text-2xl font-bold rounded-xl transition-colors touch-manipulation ${
                      gameState.userProfile.gender === 'male'
                        ? 'bg-[#2E7D32] text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    남자
                  </button>
                  <button
                    onClick={() =>
                      setGameState((prev) => ({
                        ...prev,
                        userProfile: { ...prev.userProfile, gender: 'female' },
                      }))
                    }
                    className={`h-12 sm:h-16 text-lg sm:text-2xl font-bold rounded-xl transition-colors touch-manipulation ${
                      gameState.userProfile.gender === 'female'
                        ? 'bg-[#2E7D32] text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    여자
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleNextStep}
              className="w-full h-12 sm:h-16 bg-[#2E7D32] text-white text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl hover:bg-[#1B5E20] active:bg-[#1B5E20] transition-colors shadow-lg touch-manipulation"
            >
              시작하기
            </button>
          </div>
        </div>
      );
    }

    // 결과 화면 (고도화된 간병비 알고리즘 적용)
    if (gameState.currentStep >= TOTAL_QUESTIONS) {
      const { categoryScores, categoryMaxScores, totalScore, maxScore } = calculateScores();
      const percentage = Math.round((totalScore / maxScore) * 100);
      
      // 1. 나이 가져오기 (입력 안 했으면 기본 60세로 가정)
      const userAge = gameState.userProfile.age || 60;
      
      // 2. 핵심 위험 요소 확인
      // - 기억력 저하 여부
      const memoryScore = categoryScores['기억력'];
      const memoryMax = categoryMaxScores['기억력'];
      const isMemoryFail = memoryMax > 0 && (memoryScore / memoryMax) < 0.6;
      
      // - 반응속도 저하 여부 (0.5초 이상이면 느림)
      const reactionTime = gameState.reactionTime || 0;
      const isSlowReaction = reactionTime > 500;

      // - 가족 설문 답변
      const familyCareAnswer = gameState.answers[13] as string;

      // ---------------------------------------------------------
      // 💰 [핵심] 다이내믹 예상 비용 산출 알고리즘
      // ---------------------------------------------------------
      let baseCost = 0; // 월 예상 비용 (단위: 만 원)

      // (1) 점수 기반 기초 비용 (95점에서 1점 까일 때마다 3만원 추가)
      if (percentage < 95) {
          baseCost += (95 - percentage) * 3; 
      }

      // (2) 나이 가중치 (50세 이상부터, 1살당 2만원씩 할증)
      if (userAge >= 50) {
          baseCost += (userAge - 50) * 2;
      }

      // (3) 피지컬 페널티 (반응속도 느리면 +40만원)
      if (isSlowReaction) {
          baseCost += 40;
      }

      // (4) 기억력 페널티 (기억력 나쁘면 +50만원)
      if (isMemoryFail) {
          baseCost += 50;
      }

      // (5) 기회비용 (자녀 선택 시 자녀 소득 중단 고려 -> +150만원)
      if (familyCareAnswer === '자녀') {
          baseCost += 150; 
      } else if (familyCareAnswer === '간병인/요양병원') {
          baseCost += 100; // 간병인 기본 시세 반영
      }

      // (6) 최소/최대 보정 (최소 0원 ~ 최대 450만원)
      if (percentage >= 95 && !isSlowReaction && !isMemoryFail) baseCost = 0; // 완벽하면 0원
      if (baseCost > 450) baseCost = 450; // 요양병원 Max치

      // 연간 비용 계산
      const estimatedYearlyCost = baseCost * 12;

      // 뇌 나이 텍스트 생성
      let brainAgeText = '20대 (최고)';
      if (percentage < 60) brainAgeText = `${userAge + 15}세 (위험)`;
      else if (percentage < 80) brainAgeText = `${userAge + 8}세 (주의)`;
      else if (percentage < 90) brainAgeText = `${userAge + 3}세 (관리 필요)`;
      else brainAgeText = `${Math.max(20, userAge - 5)}세 (양호)`;

      const isGoldBrain = percentage >= 95 && !isMemoryFail && !isSlowReaction; // 황금 인증서 기준

      return (
        <div className="flex flex-col items-center h-full p-4 space-y-4 overflow-y-auto bg-gradient-to-b from-green-50 to-orange-50">
          <div className="text-6xl mt-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-800">종합 정밀 분석</h2>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg w-full text-center relative overflow-hidden">
            <p className="text-gray-500 font-bold">나의 뇌 활력 점수</p>
            <div className="text-6xl font-black text-[#2E7D32] my-3">{percentage}점</div>
            <div className="flex justify-center items-center gap-2">
              <span className="text-gray-600">신체 나이: {userAge}세</span>
              <span className="text-gray-300">|</span>
              <span className="text-lg font-bold text-[#EF6C00]">뇌 나이: {brainAgeText}</span>
            </div>
            
            {/* 경고 태그들 */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {isMemoryFail && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">🚨 기억력 저하</span>}
              {isSlowReaction && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">⚡ 반응속도 느림</span>}
              {familyCareAnswer === '자녀' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">💔 자녀 부담 위험</span>}
            </div>
          </div>

          {/* 예상 비용 시뮬레이터 (가장 중요한 세일즈 포인트) */}
          <div className={`w-full p-5 border-2 rounded-xl shadow-md transition-all ${baseCost > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-center font-bold text-gray-700 mb-1">
              📉 향후 발생 가능한 <span className="text-red-600">월 관리 비용</span>
            </p>
            <p className="text-center text-xs text-gray-500 mb-4">
              (현재 점수 + 연령 + 가족 상황 + 물가 상승률 반영)
            </p>
            
            <div className="flex justify-between items-end border-b border-gray-300 pb-2 mb-2">
              <span className="text-gray-700 font-medium">월 예상 지출</span>
              <span className={`text-3xl font-black ${baseCost > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <AnimatedNumber value={baseCost} />만 원
              </span>
            </div>
            
            <div className="flex justify-between items-end">
              <span className="text-gray-700 font-medium">10년 누적 손실</span>
              <span className="text-xl font-bold text-gray-800">
                약 <AnimatedNumber value={estimatedYearlyCost * 10} />만 원
              </span>
            </div>

            {/* 비용에 따른 맞춤 멘트 */}
            <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200 text-center">
              {baseCost === 0 ? (
                <p className="text-sm text-green-700 font-bold">
                  🎉 완벽합니다! 이대로만 관리하세요.
                </p>
              ) : baseCost < 150 ? (
                <p className="text-sm text-orange-700">
                  "아직은 괜찮지만, <span className="font-bold">월 {baseCost}만원</span>의 예방 투자가 필요합니다."
                </p>
              ) : (
                <p className="text-sm text-red-700 font-bold animate-pulse">
                  "경고: 지금 준비 안 하면 자녀에게 큰 짐이 됩니다."
                </p>
              )}
            </div>
          </div>

          {/* 영역별 점수 표시 (간소화) */}
          <div className="w-full bg-white p-4 rounded-xl shadow-lg">
            <p className="text-lg font-bold text-gray-800 text-center mb-3">영역별 점수</p>
            <div className="space-y-2">
              {CATEGORIES.map((category) => {
                const score = categoryScores[category];
                const max = categoryMaxScores[category];
                if (max === 0) return null;
                const percent = Math.round((score / max) * 100);
                const feedback = getCategoryFeedback(category, percent, score, max);
                
                return (
                  <div key={category} className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-700">{category}</span>
                      <span className={`text-sm font-bold ${percent >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                        {score}/{max} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          percent >= 80 ? 'bg-green-500' : percent >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    {feedback && (
                      <div className="mt-1 p-2 bg-red-50 border-l-4 border-red-500 rounded-r">
                        <p className="text-xs text-red-800 leading-relaxed mb-1">{feedback.message}</p>
                        {feedback.solution && (
                          <div className="mt-2 p-2 bg-white rounded border border-red-200">
                            <p className="text-xs text-gray-700 leading-relaxed font-semibold">{feedback.solution}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 가족 부양 부담 분석 */}
          {familyCareAnswer && (
            <div className="w-full p-4 bg-orange-50 border-2 border-orange-300 rounded-xl">
              <p className="text-lg font-bold text-center text-orange-800 mb-3">
                💭 가족 부양 부담 분석
              </p>
              <div className="bg-white p-4 rounded-xl">
                {familyCareAnswer === '배우자' && (
                  <p className="text-base text-orange-800 text-center leading-relaxed">
                    배우자님께 의존하시는군요.<br />
                    하지만 배우자님도 연로하시면<br />
                    <span className="font-bold">서로 돌보기 어려운 상황</span>이<br />
                    올 수 있습니다.
                  </p>
                )}
                {familyCareAnswer === '자녀' && (
                  <p className="text-base text-orange-800 text-center leading-relaxed">
                    자녀분께 의존하시는군요.<br />
                    하지만 자녀분의<br />
                    <span className="font-bold">경제활동이 중단</span>되면<br />
                    가족 전체가<br />
                    어려워질 수 있습니다.
                  </p>
                )}
                {familyCareAnswer === '간병인/요양병원' && (
                  <p className="text-base text-orange-800 text-center leading-relaxed">
                    간병인이나 요양병원을<br />
                    고려하시는군요.<br />
                    <span className="font-bold">매달 400만 원 이상</span>의<br />
                    비용이 필요합니다.
                  </p>
                )}
                {familyCareAnswer === '잘 모르겠다' && (
                  <p className="text-base text-orange-800 text-center leading-relaxed">
                    아직 준비가<br />
                    되어 있지 않으시군요.<br />
                    <span className="font-bold">지금부터 준비</span>해야 합니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* DB 입력 폼 (수정됨: 컴플라이언스 준수 + 전문가 컨셉) */}
          <div className="w-full bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] p-5 rounded-2xl text-center shadow-xl text-white">
            <div className="mb-4">
              <p className="text-yellow-300 font-bold text-lg animate-bounce">
                🎁 무료 정밀 분석 대상자입니다!
              </p>
              <p className="text-sm opacity-90 mt-1 leading-relaxed">
                예상되는 <span className="font-bold text-yellow-300">{baseCost}만원의 간병비 부담</span>을<br/>
                줄일 수 있는 <strong>[치매 검사 결과 분석표]</strong>와<br/>
                <strong>[맞춤형 시크릿 플랜]</strong>을 보내드립니다.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <input 
                type="tel" 
                placeholder="휴대폰 번호 입력 (-없이)" 
                className="w-full p-4 rounded-xl text-gray-900 text-center font-bold text-lg shadow-inner focus:ring-4 focus:ring-yellow-400 outline-none"
                value={gameState.phoneNumber}
                onChange={(e) => setGameState(p => ({...p, phoneNumber: e.target.value}))}
              />
              <button 
                onClick={() => {
                  if(gameState.phoneNumber.length > 9) {
                    alert(`신청 완료!\n\n입력하신 ${gameState.phoneNumber} 번호로\n[정밀 분석 리포트]가 발송됩니다.`);
                  } else {
                    alert('정확한 전화번호를 입력해주세요.');
                  }
                }}
                className="w-full bg-[#EF6C00] hover:bg-[#E65100] text-white py-4 rounded-xl font-bold text-xl shadow-lg transform active:scale-95 transition-all"
              >
                분석 리포트 받기 📩
              </button>
            </div>
            <p className="text-[10px] opacity-60 mt-3">
              보내주신 정보는 결과 분석 및 상담 외의 용도로 사용되지 않습니다.
            </p>
          </div>

          {/* 황금 뇌 인증서 (95점 이상) */}
          {isGoldBrain && (
            <div className="w-full mb-2 bg-gradient-to-br from-yellow-50 to-amber-50 border-4 border-yellow-400 rounded-2xl p-4 shadow-lg">
              <div className="text-center">
                <div className="text-5xl mb-2">🏆</div>
                <p className="text-xl font-bold text-yellow-800 mb-1">황금 뇌 인증서</p>
                <div className="border-t-2 border-yellow-400 my-2"></div>
                <p className="text-sm text-yellow-700 leading-relaxed">
                  위 사람은 상위 1%의 뇌 건강을<br />
                  보유하고 있음을 인증합니다.
                </p>
                <p className="text-xs text-yellow-600 mt-2">- 닥터 든든이 -</p>
                <button
                  onClick={() => {
                    // 공유 기능 (카카오톡 등)
                    if (navigator.share) {
                      navigator.share({
                        title: '황금 뇌 인증서 획득!',
                        text: `뇌 건강 테스트에서 ${percentage}점으로 황금 뇌 인증서를 받았습니다!`,
                        url: window.location.href,
                      });
                    } else {
                      // 공유 불가 시 클립보드 복사
                      navigator.clipboard.writeText(`뇌 건강 테스트에서 ${percentage}점으로 황금 뇌 인증서를 받았습니다! ${window.location.href}`);
                      alert('인증서 내용이 복사되었습니다! 카톡방에 붙여넣기 하세요.');
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-lg active:bg-yellow-500 touch-manipulation"
                >
                  📱 카톡방에 자랑하기
                </button>
              </div>
            </div>
          )}
          
          {/* 공유 버튼 (90점 이하일 때도 표시) */}
          {!isGoldBrain && (
            <div className="w-full mb-2 bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-lg">
              <div className="text-center">
                <button
                  onClick={() => {
                    // 점수에 따른 메시지 생성
                    let shareTitle = '';
                    let shareText = '';
                    
                    if (percentage >= 70) {
                      shareTitle = '뇌 건강 테스트 결과!';
                      shareText = `뇌 건강 테스트에서 ${percentage}점을 받았어요! 뇌 나이는 ${brainAgeText}입니다.`;
                    } else if (percentage >= 50) {
                      shareTitle = '뇌 건강 테스트 결과';
                      shareText = `뇌 건강 테스트에서 ${percentage}점을 받았어요. 뇌 건강 관리를 시작해야 할 것 같아요!`;
                    } else {
                      shareTitle = '뇌 건강 테스트 결과';
                      shareText = `뇌 건강 테스트에서 ${percentage}점을 받았어요. 전문가 상담이 필요할 수 있어요.`;
                    }
                    
                    // 공유 기능 (카카오톡 등)
                    if (navigator.share) {
                      navigator.share({
                        title: shareTitle,
                        text: shareText,
                        url: window.location.href,
                      });
                    } else {
                      // 공유 불가 시 클립보드 복사
                      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
                      alert('결과 내용이 복사되었습니다! 카톡방에 붙여넣기 하세요.');
                    }
                  }}
                  className="w-full px-4 py-3 bg-[#2E7D32] text-white text-base font-bold rounded-lg active:bg-[#1B5E20] touch-manipulation shadow-lg"
                >
                  📱 카톡방에 결과 공유하기
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={() => window.location.reload()}
            className="text-gray-500 underline text-sm py-6"
          >
            처음부터 다시 테스트하기
          </button>
        </div>
      );
    }

    // 휴식 메시지 화면
    if (gameState.showingBreak) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-3 sm:p-6 space-y-4 sm:space-y-8 bg-gradient-to-b from-green-50 to-orange-50">
          <div className="text-5xl sm:text-8xl mb-2 sm:mb-4 animate-bounce flex-shrink-0">🐻</div>
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg w-full text-center flex-shrink-0">
            <p className="text-2xl sm:text-3xl font-bold text-[#2E7D32] mb-3 sm:mb-4">
              잠시 쉬어가세요! 😊
            </p>
            <p className="text-xl sm:text-2xl text-gray-700">
              다음 문제가 곧 시작됩니다...
            </p>
          </div>
        </div>
      );
    }

    // 문제 화면
    // currentStep이 유효한 범위인지 확인
    if (gameState.currentStep < 0 || gameState.currentStep >= TOTAL_QUESTIONS) {
      return null;
    }
    
    const question = QUIZ_QUESTIONS[gameState.currentStep];
    if (!question) {
      return null;
    }
    
    const currentAnswer = gameState.answers[question.id];
    
    // 나이에 따른 난이도 조절 (70세 이상은 힌트 제공)
    const showHint = gameState.userProfile.age >= 70;

    return (
      <div className="flex flex-col items-center justify-center h-full p-3 sm:p-6 space-y-2 sm:space-y-4 bg-gradient-to-b from-green-50 to-orange-50 overflow-y-auto">
        {renderProgressBar()}
        <div className="flex items-center justify-between w-full mb-1 sm:mb-2 flex-shrink-0">
          <div className="text-lg sm:text-2xl text-gray-600">
            {gameState.currentStep + 1} / {TOTAL_QUESTIONS}
          </div>
          {/* 타이머 표시 (가족부양질문과 두더지 잡기는 제외) */}
          {question.timeLimit && 
           gameState.timeRemaining !== undefined && 
           question.type !== 'family-care' && 
           question.type !== 'whack-a-mole' && (
            <div 
              className={`text-2xl sm:text-4xl font-bold transition-all duration-300 ${
                gameState.timeRemaining <= 5 
                  ? 'text-red-600 animate-pulse scale-110' 
                  : gameState.timeRemaining <= 10
                    ? 'text-orange-500'
                    : 'text-orange-400'
              }`}
            >
              ⏱ {gameState.timeRemaining}초
              {gameState.timeRemaining <= 5 && (
                <span className="ml-1 sm:ml-2 text-lg sm:text-2xl">⚠️</span>
              )}
            </div>
          )}
        </div>
        <div className="text-4xl sm:text-6xl mb-2 sm:mb-4 flex-shrink-0">🐻</div>
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg w-full flex-shrink-0">
          <p className="text-xl leading-relaxed text-center text-gray-800 mb-4">
            {question.type === 'whack-a-mole' ? (
              <>
                <span className="text-red-600 font-bold">빨간색 곰돌이</span>가 나오면 누르고, <span className="text-blue-600 font-bold">파란색 곰돌이</span>가 나오면 누르지 마세요!
              </>
            ) : (
              question.questionText
            )}
          </p>

          {/* 기억 입력 (Q1) - 어르신을 위해 크게 */}
          {question.type === 'memory-input' && (
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="grid grid-cols-3 gap-3 w-full">
                {(question.correctAnswer as string[]).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#EF6C00] text-white p-6 rounded-2xl text-center shadow-md min-h-[120px] flex items-center justify-center"
                  >
                    <div className="text-6xl font-bold">{item}</div>
                  </div>
                ))}
              </div>
              <p className="text-base text-center text-gray-600">
                3초 후 자동으로 넘어갑니다...
              </p>
            </div>
          )}

          {/* 시계 선택 */}
          {question.type === 'clock' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {question.options?.map((option, idx) => {
                // 시계 시간 설정: clock1=3시45분(정답), clock2=2시15분, clock3=4시20분, clock4=3시10분
                const clockTimes = [
                  { hour: 3, minute: 45 }, // 정답
                  { hour: 2, minute: 15 },
                  { hour: 4, minute: 20 },
                  { hour: 3, minute: 10 },
                ];
                const time = clockTimes[idx];
                const hourAngle = (time.hour % 12) * 30 + time.minute * 0.5; // 시침 각도
                const minuteAngle = time.minute * 6; // 분침 각도

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`h-28 sm:h-36 rounded-xl sm:rounded-2xl transition-all shadow-lg touch-manipulation flex items-center justify-center ${
                      currentAnswer === option
                        ? 'bg-[#2E7D32] border-4 border-[#1B5E20] scale-105'
                        : 'bg-white border-2 border-gray-300 hover:border-[#2E7D32] active:scale-95'
                    }`}
                  >
                    <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 border-gray-800">
                      {/* 시계 숫자 표시 (12, 3, 6, 9) */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-1 text-xs font-bold">12</div>
                      <div className="absolute right-0 top-1/2 transform translate-y-[-50%] mr-1 text-xs font-bold">3</div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 text-xs font-bold">6</div>
                      <div className="absolute left-0 top-1/2 transform translate-y-[-50%] ml-1 text-xs font-bold">9</div>
                      
                      {/* 중앙 점 */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 rounded-full z-10"></div>
                      
                      {/* 시침 */}
                      <div
                        className="absolute top-1/2 left-1/2 w-1 bg-gray-800 origin-bottom"
                        style={{
                          height: '30px',
                          transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
                          transformOrigin: 'bottom center',
                        }}
                      ></div>
                      
                      {/* 분침 */}
                      <div
                        className="absolute top-1/2 left-1/2 w-0.5 bg-gray-800 origin-bottom"
                        style={{
                          height: '40px',
                          transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
                          transformOrigin: 'bottom center',
                        }}
                      ></div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 단일 선택 */}
          {question.type === 'choice' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {question.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, option)}
                  className={`h-14 sm:h-20 text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl transition-colors shadow-lg touch-manipulation ${
                    currentAnswer === option
                      ? 'bg-[#2E7D32] text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* 숫자 거꾸로 입력 (Q3) - 모바일 한 화면 최적화 */}
          {question.type === 'reverse-number-input' && (
            <div className="space-y-2">
              {/* 숫자 표시 (1초 간격으로 하나씩 표시) - 작게 */}
              <div className="transform scale-90 origin-top">
                <ReverseNumberDisplay sequence={gameState.reverseNumberSequence || [9, 4, 8, 3, 7]} />
              </div>
              
              {/* 입력된 숫자 표시 - 작게 */}
              <div className="bg-gray-100 p-2 rounded-xl text-center">
                <div className="text-xs text-gray-600 mb-1">입력한 숫자:</div>
                <div className="text-xl font-bold text-gray-800 min-h-[30px] flex items-center justify-center gap-1">
                  {(currentAnswer as number[])?.map((num, idx) => (
                    <span key={idx} className="px-1">{num}</span>
                  )) || <span className="text-gray-400">-</span>}
                </div>
              </div>

              {/* 숫자 키패드 - 작게 */}
              <div className="grid grid-cols-3 gap-1.5 max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = (currentAnswer as number[]) || [];
                      if (current.length < 5) {
                        handleAnswer(question.id, [...current, num]);
                      }
                    }}
                    disabled={(currentAnswer as number[])?.length >= 5}
                    className="h-12 text-xl font-bold rounded-lg bg-gray-200 text-gray-800 active:bg-gray-400 disabled:bg-gray-100 disabled:text-gray-400 touch-manipulation transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* 삭제/확인 버튼 - 한 줄에 */}
              <div className="grid grid-cols-2 gap-2">
                {(currentAnswer as number[])?.length > 0 && (
                  <button
                    onClick={() => {
                      const current = (currentAnswer as number[]) || [];
                      handleAnswer(question.id, current.slice(0, -1) as number[]);
                    }}
                    className="h-10 bg-red-500 text-white text-base font-bold rounded-xl active:bg-red-700 transition-colors touch-manipulation"
                  >
                    지우기
                  </button>
                )}
                {(currentAnswer as number[])?.length === 5 && (
                  <button
                    onClick={handleNextStep}
                    className={`h-10 bg-[#2E7D32] text-white text-base font-bold rounded-xl active:bg-[#1B5E20] transition-colors shadow-lg touch-manipulation ${
                      (currentAnswer as number[])?.length > 0 ? '' : 'col-span-2'
                    }`}
                  >
                    확인하기
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stroop Test (Q3) */}
          {question.type === 'stroop' && (
            <div className="space-y-3 sm:space-y-6">
              {/* "노랑"이라는 글자가 파란색으로 표시 */}
              <div className="flex items-center justify-center min-h-[120px] sm:min-h-[200px] bg-gray-50 rounded-xl sm:rounded-2xl">
                <div className="text-5xl sm:text-7xl font-bold" style={{ color: '#3B82F6' }}>
                  노랑
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {question.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`h-16 sm:h-24 text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl transition-colors shadow-lg touch-manipulation ${
                      currentAnswer === option
                        ? 'bg-[#2E7D32] text-white scale-105'
                        : option === '파랑'
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : option === '빨강'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : option === '노랑'
                              ? 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                              : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 연속 뺄셈 (Q7) - MMSE 핵심 문항 (3단계로 개선) */}
          {question.type === 'serial-subtraction' && (
            <div className="space-y-4 sm:space-y-8">
              <div className="bg-orange-100 p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center">
                <div className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2">
                  100 <span className="text-red-500">- 7</span> <span className="text-red-500">- 7</span> <span className="text-red-500">- 7</span> = <span className="text-[#2E7D32] text-3xl sm:text-5xl">?</span>
                </div>
                <p className="text-gray-600 text-sm sm:text-lg mb-2">
                  (100에서 7을 빼고, 남은 숫자에서 또 7을 빼고, 또 7을 뺍니다)
                </p>
                {showHint && (
                  <div className="bg-blue-100 border-2 border-blue-300 p-2 sm:p-3 rounded-lg mt-3">
                    <p className="text-xs sm:text-sm text-blue-800 font-semibold">
                      💡 단계별 힌트: 첫 번째 100-7=93, 두 번째 93-7=86, 세 번째 86-7=79
                    </p>
                  </div>
                )}
                {!showHint && (
                  <div className="bg-white/60 p-2 sm:p-3 rounded-lg mt-3">
                    <p className="text-xs sm:text-sm text-gray-700">
                      💡 힌트: 첫 번째 100-7=93, 두 번째 93-7=86, 세 번째 86-7=?
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-5">
                {question.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`h-20 sm:h-28 text-2xl sm:text-4xl font-bold rounded-xl sm:rounded-2xl transition-all shadow-lg touch-manipulation border-b-4 ${
                      currentAnswer === option
                        ? 'bg-[#2E7D32] text-white border-[#1B5E20] transform translate-y-1'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 active:border-t-4 active:border-b-0'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 시간 계산 (Q5) - 레거시, 삭제 예정 */}
          {question.type === 'time-calculation' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {question.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, option)}
                  className={`h-16 sm:h-24 text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl transition-colors shadow-lg touch-manipulation ${
                    currentAnswer === option
                      ? 'bg-[#2E7D32] text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* 기호 찾기 (Q4) - MoCA 주의력 변형 (개선됨) */}
          {question.type === 'symbol-count' && (
            <div className="space-y-3 sm:space-y-6">
              {/* 기호 표시 영역 - 더 어렵게: 네잎클로버🍀를 섞어서 혼동 증가 (색상 동일하게) */}
              <div className="bg-white border-2 border-gray-200 p-3 rounded-xl text-center shadow-inner">
                <div className="grid grid-cols-5 gap-1 text-lg leading-relaxed select-none">
                  {/* 네잎클로버🍀를 섞어서 클로버♣️와 혼동 유발 (클로버 7개, 네잎클로버 5개) - 색상 동일하게 (완전 회색조) */}
                  <span>♠️</span> <span>♣️</span> <span style={{ filter: 'grayscale(100%) brightness(0.2) contrast(2)' }}>🍀</span> <span>♦️</span> <span>♣️</span>
                  <span>♥️</span> <span>♠️</span> <span>♣️</span> <span style={{ filter: 'grayscale(100%) brightness(0.2) contrast(2)' }}>🍀</span> <span>♥️</span>
                  <span>♣️</span> <span>♦️</span> <span style={{ filter: 'grayscale(100%) brightness(0.2) contrast(2)' }}>🍀</span> <span>♣️</span> <span>♠️</span>
                  <span>♥️</span> <span>♣️</span> <span style={{ filter: 'grayscale(100%) brightness(0.2) contrast(2)' }}>🍀</span> <span>♠️</span> <span>♣️</span>
                  <span>♦️</span> <span style={{ filter: 'grayscale(100%) brightness(0.2) contrast(2)' }}>🍀</span> <span>♥️</span> <span>♠️</span> <span>♦️</span>
                </div>
                <p className="text-sm text-[#EF6C00] font-bold mt-3 bg-orange-50 inline-block px-3 py-1.5 rounded-full">
                  ♣️ 클로버(세잎)의 개수는?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  (네잎클로버🍀, 스페이드♠️, 하트♥️, 다이아몬드♦️는 제외하세요)
                </p>
                {showHint && (
                  <div className="bg-blue-100 border-2 border-blue-300 p-2 rounded-lg mt-2">
                    <p className="text-xs text-blue-800 font-semibold">
                      💡 힌트: 네잎클로버🍀는 제외하고, 세잎클로버♣️만 세세요. 첫 줄 2개, 둘째 줄 1개, 셋째 줄 2개, 넷째 줄 2개 = 총 7개
                    </p>
                  </div>
                )}
              </div>

              {/* 선택 버튼 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {question.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`h-16 sm:h-24 text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl transition-colors shadow-lg touch-manipulation ${
                      currentAnswer === option
                        ? 'bg-[#2E7D32] text-white scale-105'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 'ㅎ' 찾기 (Q4) - 레거시, 삭제 예정 */}
          {question.type === 'character-count' && (
            <div className="space-y-3 sm:space-y-6">
              {/* 글자 표시 영역 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-8 rounded-xl sm:rounded-2xl text-center">
                <div className="text-3xl sm:text-5xl font-bold text-gray-800 leading-relaxed space-y-1 sm:space-y-2">
                  <div>호 하 흐 호 후</div>
                  <div>허 호 하</div>
                </div>
                <p className="text-base sm:text-xl text-gray-600 mt-2 sm:mt-4">
                  "호"가 몇 개인지 세어보세요
                </p>
              </div>

              {/* 선택 버튼 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {question.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`h-16 sm:h-24 text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl transition-colors shadow-lg touch-manipulation ${
                      currentAnswer === option
                        ? 'bg-[#2E7D32] text-white scale-105'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 복합 계산 (Q6) */}
          {question.type === 'complex-calculation' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {question.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, option)}
                  className={`h-16 sm:h-24 text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl transition-colors shadow-lg touch-manipulation ${
                    currentAnswer === option
                      ? 'bg-[#2E7D32] text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* 순발력 테스트 (Q11) - 반응 속도 측정 */}
          {question.type === 'reaction-speed' && (
            <ReactionSpeedTest
              onComplete={(reactionTime: number) => {
                setGameState((prev) => ({ ...prev, reactionTime }));
                handleAnswer(question.id, 'completed');
                // handleAnswer에서 자동 진행하지 않으므로 여기서만 handleNextStep 호출
                setTimeout(() => handleNextStep(), 1500);
              }}
            />
          )}

          {/* 카드 짝 맞추기 게임 (Q2) */}
          {question.type === 'card-match' && (
            <CardMatchGame
              onComplete={(isSuccess: boolean, attempts: number) => {
                handleAnswer(question.id, isSuccess ? 'completed' : 'failed');
                // 시도 횟수 저장 (차등 점수 계산용)
                setGameState((prev) => ({ ...prev, cardAttempts: attempts }));
                // handleAnswer에서 자동 진행하지 않으므로 여기서만 handleNextStep 호출
                setTimeout(() => handleNextStep(), 1500);
              }}
              timeLimit={question.timeLimit || 30}
            />
          )}

          {/* 슐테 테이블 게임 (Q5) */}
          {question.type === 'schulte-table' && (
            <SchulteTableGame
              onComplete={(time: number, isSuccess: boolean) => {
                handleAnswer(question.id, isSuccess ? 'completed' : 'failed');
                // 완료 시간 저장 (차등 점수 계산용)
                setGameState((prev) => ({ ...prev, schulteTime: time }));
                // handleAnswer에서 자동 진행하지 않으므로 여기서만 handleNextStep 호출
                setTimeout(() => handleNextStep(), 1500);
              }}
              timeLimit={question.timeLimit || 30}
            />
          )}

          {/* 두더지 잡기 게임 (Q12) - Go/No-Go 테스트 */}
          {question.type === 'whack-a-mole' && (
            <WhackAMoleGame
              onComplete={(accuracy: number, correctHits: number, wrongHits: number) => {
                // 정확도 저장
                setGameState((prev) => ({ ...prev, whackAccuracy: accuracy }));
                // 정확도 75% 이상이면 성공 (난이도 상승)
                const isSuccess = accuracy >= 75;
                handleAnswer(question.id, isSuccess ? 'completed' : 'failed');
                // handleAnswer에서 자동 진행하지 않으므로 여기서만 handleNextStep 호출
                setTimeout(() => handleNextStep(), 2000);
              }}
              timeLimit={question.timeLimit || 20}
            />
          )}

          {/* 가족 부양 질문 (Q13) - 현실 자각 설문 */}
          {question.type === 'family-care' && (
            <div className="space-y-4">
              <div className="bg-orange-50 border-2 border-orange-300 p-4 rounded-xl mb-4">
                <p className="text-base text-orange-800 text-center leading-relaxed">
                  💭 잠깐, 중요한 질문이 하나 남았습니다
                </p>
              </div>
              
              <div className="space-y-3">
                {question.options?.map((option, idx) => {
                  const selected = currentAnswer === option;
                  let warningMessage = '';
                  
                  if (option === '배우자') {
                    warningMessage = '배우자님도 연로하실 텐데 괜찮을까요?';
                  } else if (option === '자녀') {
                    warningMessage = '자녀분의 경제활동이 중단될 수도 있습니다.';
                  } else if (option === '간병인/요양병원') {
                    warningMessage = '매달 400만 원 이상, 준비되셨나요?';
                  } else if (option === '잘 모르겠다') {
                    warningMessage = '준비가 되어 있지 않다면 지금부터 시작해야 합니다.';
                  }
                  
                  return (
                    <div key={idx}>
                      <button
                        onClick={() => {
                          handleAnswer(question.id, option);
                        }}
                        className={`w-full h-14 text-base font-bold rounded-xl transition-all touch-manipulation border-2 ${
                          selected
                            ? 'bg-[#EF6C00] text-white border-[#E65100] scale-105'
                            : 'bg-white text-gray-800 border-gray-300 active:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                      {selected && warningMessage && (
                        <div className="mt-2 p-2 bg-red-50 border-l-4 border-red-500 rounded-r">
                          <p className="text-xs text-red-800 text-center">{warningMessage}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* 확인 버튼 - 선택 후에만 표시 */}
              {currentAnswer && (
                <button
                  onClick={() => {
                    // 가족부양질문은 확인 버튼을 눌러야만 결과 화면으로 이동
                    setGameState((prev) => ({ ...prev, currentStep: TOTAL_QUESTIONS as Step }));
                  }}
                  className="w-full h-14 bg-[#2E7D32] text-white text-base font-bold rounded-xl active:bg-[#1B5E20] transition-colors shadow-lg touch-manipulation mt-4"
                >
                  확인하고 결과 보기
                </button>
              )}
            </div>
          )}

          {/* 다중 선택 (Q7: 지연 회상) - 어르신을 위해 크게, 한 화면에 */}
          {question.type === 'multi-choice' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {question.options?.map((option, idx) => {
                  const selected = (currentAnswer as string[])?.includes(option) || false;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleMultipleSelect(question.id, option)}
                      disabled={(currentAnswer as string[])?.length >= 5 && !selected}
                      className={`h-20 text-4xl font-bold rounded-xl transition-all touch-manipulation border-2 ${
                        selected
                          ? 'bg-[#2E7D32] text-white border-[#1B5E20] scale-105'
                          : (currentAnswer as string[])?.length >= 5
                            ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-800 border-gray-300 active:bg-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-center text-gray-600">
                선택된 항목: {(currentAnswer as string[])?.length || 0}개
              </p>
              {(currentAnswer as string[])?.length >= 3 && (
                <button
                  onClick={handleNextStep}
                  className="w-full h-12 bg-[#2E7D32] text-white text-base font-bold rounded-xl active:bg-[#1B5E20] transition-colors shadow-lg touch-manipulation"
                >
                  확인하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return <main className="h-screen overflow-hidden bg-gradient-to-b from-green-50 to-orange-50">{renderQuestion()}</main>;
}

'use client';

import { useState, useEffect } from 'react';
import { QUIZ_QUESTIONS, QuizQuestion, CategoryName, CATEGORIES, UserProfile, getNormalRange } from '../data/quizData';

type Step = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11; // -1: 인트로, 0-9: 문제(10개), 10: 결과

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
  });


  // 타이머 관리
  useEffect(() => {
    if (gameState.currentStep >= 0 && gameState.currentStep < TOTAL_QUESTIONS) {
      const question = QUIZ_QUESTIONS[gameState.currentStep];
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


  const handleNextStep = () => {
    if (gameState.currentStep < TOTAL_QUESTIONS) {
      // 첫 번째 문제 이후부터 결과 화면 전까지 휴식 메시지 표시
      if (gameState.currentStep > 0 && gameState.currentStep < TOTAL_QUESTIONS - 1) {
        setGameState((prev) => ({ ...prev, showingBreak: true }));
        // 2초 후 다음 문제로
        setTimeout(() => {
          setGameState((prev) => ({ 
            ...prev, 
            currentStep: (prev.currentStep + 1) as Step,
            showingBreak: false 
          }));
        }, 2000);
      } else {
        setGameState((prev) => ({ ...prev, currentStep: (prev.currentStep + 1) as Step }));
      }
    }
  };

  const handleAnswer = (questionId: number, answer: string | string[] | number[]) => {
    setGameState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }));

    const question = QUIZ_QUESTIONS[questionId - 1];
    if (question.type === 'memory-input') {
      setGameState((prev) => ({
        ...prev,
        memoryItems: answer as string[],
      }));
    }

    // 단일 선택 문제는 자동으로 다음 단계로
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
    
    // 순발력 테스트는 컴포넌트 내부에서 처리
    if (question.type === 'reaction-speed') {
      // onComplete에서 처리됨
    }
    
    // 가족 부양 질문은 컴포넌트 내부에서 처리 (1.5초 후 자동 진행)
    if (question.type === 'family-care') {
      // 컴포넌트 내부에서 처리됨
    }
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

  // 점수 계산
  const calculateScores = () => {
    const categoryScores: Record<CategoryName, number> = {
      기억력: 0,
      지남력: 0,
      계산력: 0,
      시공간: 0,
      집행기능: 0,
      판단력: 0,
      작업기억: 0,
      억제능력: 0,
      주의력: 0,
    };

    const categoryMaxScores: Record<CategoryName, number> = {
      기억력: 0,
      지남력: 0,
      계산력: 0,
      시공간: 0,
      집행기능: 0,
      판단력: 0,
      작업기억: 0,
      억제능력: 0,
      주의력: 0,
    };

    QUIZ_QUESTIONS.forEach((q) => {
      const answer = gameState.answers[q.id];
      categoryMaxScores[q.category] += q.score;

      if (!answer) return;

      let isCorrect = false;
      if (Array.isArray(q.correctAnswer)) {
        if (Array.isArray(answer)) {
          // Q6 (지연 회상): 3개 이상 맞추면 점수 (부분 점수)
          if (q.id === 6) {
            const correctCount = (q.correctAnswer as string[]).filter((ans) => (answer as string[]).includes(ans)).length;
            isCorrect = correctCount >= 3; // 3개 이상 맞추면 정답
          } 
          // Q2 (숫자 거꾸로): number[] 배열 비교
          else if (q.type === 'reverse-number-input' && q.correctAnswer.length === answer.length) {
            isCorrect = (q.correctAnswer as number[]).every((val, idx) => val === (answer as number[])[idx]);
          }
          // 기타 배열 비교
          else {
            const correctAnswers = q.correctAnswer as string[];
            const userAnswers = answer as string[];
            isCorrect =
              correctAnswers.length === userAnswers.length &&
              correctAnswers.every((ans) => userAnswers.includes(ans));
          }
        }
      } else {
        isCorrect = answer === q.correctAnswer;
      }

      if (isCorrect) {
        categoryScores[q.category] += q.score;
      }
    });

    const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
    const maxScore = Object.values(categoryMaxScores).reduce((a, b) => a + b, 0);
    const correctCount = Object.entries(gameState.answers).filter(([qId, ans]) => {
      const q = QUIZ_QUESTIONS.find((q) => q.id === parseInt(qId));
      if (!q || !ans) return false;
      if (Array.isArray(q.correctAnswer)) {
        if (Array.isArray(ans)) {
          // Q6 (지연 회상): 3개 이상 맞추면 정답으로 카운트
          if (q.id === 6) {
            return (q.correctAnswer as string[]).filter((a) => (ans as string[]).includes(a)).length >= 3;
          }
          // Q2 (숫자 거꾸로): number[] 배열 비교
          if (q.type === 'reverse-number-input' && q.correctAnswer.length === ans.length) {
            return (q.correctAnswer as number[]).every((val, idx) => val === (ans as number[])[idx]);
          }
          const correctAnswers = q.correctAnswer as string[];
          const userAnswers = ans as string[];
          return correctAnswers.length === userAnswers.length && correctAnswers.every((a) => userAnswers.includes(a));
        }
        return false;
      }
      return ans === q.correctAnswer;
    }).length;

    return { categoryScores, categoryMaxScores, totalScore, maxScore, correctCount };
  };

  // 카테고리별 상세 피드백 메시지
  const getCategoryFeedback = (category: CategoryName, percent: number, score: number, max: number): string | null => {
    if (percent >= 80) return null; // 정상 범위면 피드백 없음

    const feedbacks: Record<CategoryName, (p: number) => string> = {
      작업기억: (p) => {
        if (p < 60) {
          return '숫자 거꾸로 문제를 틀리셨네요. 작업기억은 치매 초기 단계에서 가장 먼저 무너지는 부분입니다. 전문의 상담을 권장합니다.';
        }
        return '작업기억력이 평균보다 낮습니다. 뇌 건강 관리가 필요합니다.';
      },
      억제능력: (p) => {
        if (p < 60) {
          return '색깔과 글자 간섭 문제는 전두엽 기능을 보는 핵심 검사입니다. 전두엽 기능 저하는 치매 초기 증상일 수 있습니다.';
        }
        return '억제능력이 평균보다 낮습니다. 집중력 훈련을 추천합니다.';
      },
      계산력: (p) => {
        if (p < 60) {
          return '연속 뺄셈 문제를 틀리셨네요. 100-7=93, 93-7=86, 86-7=79가 정답입니다. 계산력 저하는 인지 기능 저하의 신호일 수 있습니다.';
        }
        return '계산력이 평균보다 낮습니다. 두뇌 운동을 꾸준히 해보세요.';
      },
      기억력: (p) => {
        if (p < 60) {
          return '지연 회상 문제를 틀리셨습니다. 기억력 저하는 치매의 가장 흔한 초기 증상입니다. 전문의 상담이 필요합니다.';
        }
        return '기억력이 평균보다 낮습니다. 규칙적인 뇌 건강 관리가 필요합니다.';
      },
      지남력: () => '지남력이 평균보다 낮습니다. 일상생활 주의가 필요합니다.',
      시공간: () => '시공간 능력이 평균보다 낮습니다.',
      집행기능: () => '집행기능이 평균보다 낮습니다.',
      판단력: () => '판단력이 평균보다 낮습니다.',
      주의력: (p) => {
        if (p < 60) {
          return '기호 찾기 문제를 틀리셨네요. 세잎클로버♣️는 총 7개입니다. (네잎클로버🍀는 제외) 주의력 저하는 치매 초기 증상일 수 있습니다. 전문의 상담을 권장합니다.';
        }
        return '주의력이 평균보다 낮습니다. 집중력 훈련을 추천합니다.';
      },
    };

    return feedbacks[category]?.(percent) || null;
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

    // 결과 화면
    if (gameState.currentStep >= TOTAL_QUESTIONS) {
      const { categoryScores, categoryMaxScores, totalScore, maxScore, correctCount } = calculateScores();
      const percentage = Math.round((totalScore / maxScore) * 100);
      const brainAge = getBrainAge(percentage);
      const message = getBrainAgeMessage(percentage, correctCount);
      
      // 간병비 계산 (점수가 80점 미만일 때)
      const estimatedMonthlyCost = percentage < 80 ? Math.round((80 - percentage) * 4.375) : 0; // 최대 350만원
      const estimatedYearlyCost = estimatedMonthlyCost * 12;
      
      // 가족 부양 질문 답변 가져오기
      const familyCareAnswer = gameState.answers[10] as string;
      
      // 황금 뇌 인증서 (90점 이상)
      const isGoldBrain = percentage >= 90;

      return (
        <div className="flex flex-col items-center justify-start h-full p-2 space-y-2 bg-gradient-to-b from-green-50 to-orange-50 overflow-y-auto">
          <div className="text-4xl mb-1 flex-shrink-0 pt-2">🐻</div>
          
          {/* 황금 뇌 인증서 (90점 이상) */}
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
          
          <div className="bg-white rounded-2xl p-3 shadow-lg w-full flex-shrink-0">
            <div className="text-center mb-3">
              <p className="text-2xl font-bold text-[#2E7D32] mb-2">{message}</p>
              <p className="text-lg text-gray-700">점수: {totalScore}점 / {maxScore}점</p>
              <p className="text-base text-gray-600 mt-1">뇌 나이: {brainAge}</p>
              
              {/* 반응 속도 결과 표시 */}
              {gameState.reactionTime !== undefined && (
                <div className={`mt-2 p-2 rounded-xl ${
                  gameState.reactionTime > 500 ? 'bg-red-50 border-2 border-red-300' : 'bg-blue-50 border-2 border-blue-300'
                }`}>
                  <p className={`text-sm font-bold ${
                    gameState.reactionTime > 500 ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {gameState.reactionTime > 500 
                      ? `⚠️ 반응 속도: ${(gameState.reactionTime / 1000).toFixed(2)}초 - 뇌 전달 속도가 느려지고 있어요`
                      : `✅ 반응 속도: ${(gameState.reactionTime / 1000).toFixed(2)}초 - 양호합니다`
                    }
                  </p>
                  {gameState.reactionTime > 500 && (
                    <p className="text-xs text-red-600 mt-1">
                      문제는 잘 푸셨지만, 반응 속도가 느리십니다. 전두엽 훈련이 필요합니다.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 영역별 점수 표시 */}
            <div className="mb-3 space-y-2">
              <p className="text-lg font-bold text-gray-800 text-center mb-2">영역별 점수</p>
              {CATEGORIES.map((category) => {
                const score = categoryScores[category];
                const max = categoryMaxScores[category];
                if (max === 0) return null;
                const percent = Math.round((score / max) * 100);
                const normalRange = gameState.userProfile.age > 0 
                  ? getNormalRange(gameState.userProfile, category)
                  : { min: 70, max: 100 };
                const isNormal = percent >= normalRange.min;
                const feedback = getCategoryFeedback(category, percent, score, max);
                
                return (
                  <div key={category} className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-700">{category}</span>
                      <span className={`text-sm ${isNormal ? 'text-green-600' : 'text-red-600'}`}>
                        {score}/{max} {isNormal ? '✓' : '⚠'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          percent >= normalRange.min ? 'bg-green-500' : percent >= normalRange.min - 10 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    {feedback && (
                      <div className="mt-1 p-2 bg-red-50 border-l-4 border-red-500 rounded-r">
                        <p className="text-xs text-red-800 leading-relaxed">{feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 가족 부양 부담 메시지 (Q10 답변 기반) */}
            {familyCareAnswer && (
              <div className="mb-3 p-3 bg-orange-50 border-2 border-orange-300 rounded-xl">
                <p className="text-sm font-bold text-center text-orange-800 mb-2">
                  💭 가족 부양 부담 분석
                </p>
                <div className="bg-white p-3 rounded-xl">
                  {familyCareAnswer === '배우자' && (
                    <p className="text-xs text-orange-800 text-center leading-relaxed">
                      배우자님께 의존하시는군요. 하지만 배우자님도 연로하시면<br />
                      <span className="font-bold">서로 돌보기 어려운 상황</span>이 올 수 있습니다.
                    </p>
                  )}
                  {familyCareAnswer === '자녀' && (
                    <p className="text-xs text-orange-800 text-center leading-relaxed">
                      자녀분께 의존하시는군요. 하지만 자녀분의<br />
                      <span className="font-bold">경제활동이 중단</span>되면 가족 전체가 어려워질 수 있습니다.
                    </p>
                  )}
                  {familyCareAnswer === '간병인/요양병원' && (
                    <p className="text-xs text-orange-800 text-center leading-relaxed">
                      간병인이나 요양병원을 고려하시는군요.<br />
                      <span className="font-bold">매달 400만 원 이상</span>의 비용이 필요합니다.
                    </p>
                  )}
                  {familyCareAnswer === '잘 모르겠다' && (
                    <p className="text-xs text-orange-800 text-center leading-relaxed">
                      아직 준비가 되어 있지 않으시군요.<br />
                      <span className="font-bold">지금부터 준비</span>해야 합니다.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 예상 간병비 시뮬레이터 (점수 80점 미만일 때) */}
            {estimatedMonthlyCost > 0 && (
              <div className="mb-3 p-3 bg-red-50 border-2 border-red-300 rounded-xl">
                <p className="text-base font-bold text-center text-red-800 mb-2">
                  💰 예상 간병비 계산
                </p>
                <div className="bg-white p-3 rounded-xl mb-2">
                  <p className="text-sm text-gray-700 mb-2">
                    현재 뇌 건강 상태로 볼 때, 10년 뒤 예상 치매 간병비는?
                  </p>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      월 <AnimatedNumber value={estimatedMonthlyCost} />만 원
                    </div>
                    <div className="text-lg text-gray-600">
                      연간 약 <AnimatedNumber value={estimatedYearlyCost} />만 원
                    </div>
                  </div>
                </div>
                <p className="text-xs text-red-800 text-center leading-relaxed">
                  ⚠️ 지금 준비하지 않으면, 10년 뒤 자녀분들이<br />
                  매달 <span className="font-bold">{estimatedMonthlyCost}만 원</span>을 부담해야 할 수도 있습니다.<br />
                  <span className="font-bold text-[#EF6C00]">이 비용을 0원으로 만드는 방법</span>을 알려드릴까요?
                </p>
                {/* 가족 부양 답변과 연계된 추가 메시지 */}
                {familyCareAnswer === '자녀' && (
                  <p className="text-xs text-red-700 text-center mt-2 font-bold">
                    💔 자녀분이 직장을 그만두고 간병해야 한다면?<br />
                    손실은 더 커집니다.
                  </p>
                )}
                {familyCareAnswer === '배우자' && (
                  <p className="text-xs text-red-700 text-center mt-2 font-bold">
                    💔 배우자님도 건강이 나빠지면?<br />
                    두 분 모두를 돌볼 사람이 필요합니다.
                  </p>
                )}
              </div>
            )}

            <div className="mb-3 p-3 bg-green-50 rounded-xl">
              <p className="text-base leading-relaxed text-center text-gray-800 mb-2">
                검사 결과가 걱정되시나요?
              </p>
              <p className="text-sm leading-relaxed text-center text-gray-700 mb-2">
                지금 보신 결과를 바탕으로<br />
                <span className="font-bold">전문 상담사가 직접 분석</span>해드리고,<br />
                맞춤형 건강 관리 가이드를<br />
                무료로 안내해드릴까요?
              </p>
              <div className="bg-white p-2 rounded-xl mb-2 border-l-4 border-[#EF6C00]">
                <p className="text-xs leading-relaxed text-center text-gray-800">
                  📞 <span className="font-bold">건강 점검 상담</span>과 함께,<br />
                  필요하시면 <span className="font-bold text-[#EF6C00]">보장 대비 방법</span>도<br />
                  무료로 안내해드립니다
                </p>
              </div>
              <input
                type="tel"
                value={gameState.phoneNumber}
                onChange={(e) =>
                  setGameState((prev) => ({ ...prev, phoneNumber: e.target.value }))
                }
                placeholder="전화번호 입력 (예: 010-1234-5678)"
                className="w-full h-12 px-3 text-base border-2 border-gray-300 rounded-xl focus:border-[#2E7D32] focus:outline-none mb-2"
              />
              <button
                onClick={() => {
                  if (gameState.phoneNumber) {
                    alert(`전화번호 ${gameState.phoneNumber}로 상세 리포트와 건강 관리 가이드를 전송하겠습니다!\n\n전문 상담사가 곧 연락드려 건강 점검과 보장 대비 상담을 도와드리겠습니다. (실제 구현 시 백엔드 API 연동 필요)`);
                  } else {
                    alert('전화번호를 입력해주세요.');
                  }
                }}
                className="w-full h-12 bg-[#EF6C00] text-white text-base font-bold rounded-xl active:bg-[#E65100] transition-colors shadow-lg touch-manipulation"
              >
                무료 리포트 및 건강 관리 가이드 받기
              </button>
              <p className="text-xs text-center text-gray-500 mt-2">
                * 개인정보는 건강 상담 목적으로만 사용됩니다
              </p>
            </div>
            <button
              onClick={() => {
                setGameState({ currentStep: -1, answers: {}, memoryItems: [], userProfile: { gender: '', age: 0 }, phoneNumber: '', reactionTime: undefined });
              }}
              className="w-full h-12 bg-gray-300 text-gray-800 text-base font-bold rounded-xl active:bg-gray-400 transition-colors shadow-lg touch-manipulation"
            >
              다시 시작하기
            </button>
          </div>
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
    const question = QUIZ_QUESTIONS[gameState.currentStep];
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
          {question.timeLimit && gameState.timeRemaining !== undefined && (
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
            {question.questionText}
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

          {/* 숫자 거꾸로 입력 (Q2) - 모바일 한 화면 최적화 */}
          {question.type === 'reverse-number-input' && (
            <div className="space-y-2">
              {/* 숫자 표시 (1초 간격으로 하나씩 표시) - 작게 */}
              <div className="transform scale-90 origin-top">
                <ReverseNumberDisplay sequence={[2, 9, 4, 8]} />
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
                      if (current.length < 4) {
                        handleAnswer(question.id, [...current, num]);
                      }
                    }}
                    disabled={(currentAnswer as number[])?.length >= 4}
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
                {(currentAnswer as number[])?.length === 4 && (
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

          {/* 연속 뺄셈 (Q5) - MMSE 핵심 문항 (3단계로 개선) */}
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

          {/* 순발력 테스트 (Q9) - 반응 속도 측정 */}
          {question.type === 'reaction-speed' && (
            <ReactionSpeedTest
              onComplete={(reactionTime: number) => {
                setGameState((prev) => ({ ...prev, reactionTime }));
                handleAnswer(question.id, 'completed');
                // 바로 다음 단계로
                handleNextStep();
              }}
            />
          )}

          {/* 가족 부양 질문 (Q10) - 현실 자각 설문 */}
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
                          // 1.5초 후 자동으로 다음 단계로
                          setTimeout(() => {
                            handleNextStep();
                          }, 1500);
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

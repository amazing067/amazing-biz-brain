'use client';

import { useState, useEffect } from 'react';
import { QUIZ_QUESTIONS, QuizQuestion, CategoryName, CATEGORIES, UserProfile, getNormalRange } from '../data/quizData';

type Step = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // -1: 인트로, 0-7: 문제(8개), 8: 결과

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
      <div className="bg-gray-100 p-6 rounded-xl text-center min-h-[120px] flex items-center justify-center">
        <p className="text-2xl text-gray-600">이제 숫자를 거꾸로 입력해주세요!</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-8 rounded-xl text-center min-h-[120px] flex items-center justify-center">
      {currentIndex === -2 && (
        <div className="space-y-3">
          <p className="text-3xl font-bold text-gray-800">숫자가 하나씩 나타납니다</p>
          <p className="text-2xl text-gray-700">숫자를 <span className="text-[#EF6C00] font-bold">거꾸로</span> 기억해주세요!</p>
          <p className="text-xl text-gray-600 mt-2">곧 시작합니다...</p>
        </div>
      )}
      {currentIndex === -1 && (
        <p className="text-2xl text-gray-600">준비하세요!</p>
      )}
      {currentIndex >= 0 && (
        <div className="text-8xl font-bold text-gray-800 animate-pulse">
          {sequence[currentIndex]}
        </div>
      )}
    </div>
  );
}

interface GameState {
  currentStep: Step;
  answers: Record<number, string | string[] | number[]>;
  memoryItems: string[];
  userProfile: UserProfile;
  phoneNumber: string;
  timeRemaining?: number; // 타이머
  showingBreak?: boolean; // 휴식 메시지 표시 중
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
      question.type === 'complex-calculation'
    ) {
      setTimeout(() => {
        handleNextStep();
      }, 800);
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
          return '복합 계산 문제는 일상생활에서 중요한 능력입니다. 계산력 저하는 인지 기능 저하의 신호일 수 있습니다.';
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
          return '주의력 문제를 틀리셨습니다. 주의력 저하는 치매 초기 증상일 수 있습니다. 전문의 상담을 권장합니다.';
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
      <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
        <div
          className="bg-[#2E7D32] h-4 rounded-full transition-all duration-300"
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
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8 bg-gradient-to-b from-green-50 to-orange-50">
          <div className="mb-6 animate-bounce">
            <div className="text-8xl">🐻</div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-lg w-full">
            <div className="text-center mb-8 space-y-4">
              <h1 className="text-4xl font-bold text-[#2E7D32]">안녕하세요!</h1>
              <p className="text-3xl text-gray-800">
                저는 <span className="text-[#EF6C00] font-bold">닥터 든든이</span>예요! 👋
              </p>
              <div className="text-2xl text-gray-600 leading-relaxed space-y-1">
                <p>{greeting.title}</p>
                <p>{greeting.subtitle}</p>
                <p>시작해볼까요?</p>
              </div>
            </div>

            {/* 성별/연령 입력 */}
            <div className="mb-6 space-y-4">
              <div>
                <p className="text-xl text-gray-700 mb-2">나이를 입력해주세요 (선택사항)</p>
                <p className="text-base text-gray-500 mb-3 text-center">
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
                  className="w-full min-h-[60px] h-16 px-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-[#2E7D32] focus:outline-none text-center"
                />
              </div>
              <div>
                <p className="text-xl text-gray-700 mb-2">성별을 선택해주세요 (선택사항)</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      setGameState((prev) => ({
                        ...prev,
                        userProfile: { ...prev.userProfile, gender: 'male' },
                      }))
                    }
                    className={`min-h-[60px] h-16 text-2xl font-bold rounded-xl transition-colors touch-manipulation ${
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
                    className={`min-h-[60px] h-16 text-2xl font-bold rounded-xl transition-colors touch-manipulation ${
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
              className="w-full min-h-[60px] h-16 bg-[#2E7D32] text-white text-2xl font-bold rounded-2xl hover:bg-[#1B5E20] active:bg-[#1B5E20] transition-colors shadow-lg touch-manipulation"
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

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8 bg-gradient-to-b from-green-50 to-orange-50">
          <div className="text-6xl mb-4">🐻</div>
          <div className="bg-white rounded-3xl p-6 shadow-lg w-full">
            <div className="text-center mb-8">
              <p className="text-4xl font-bold text-[#2E7D32] mb-4">{message}</p>
              <p className="text-2xl text-gray-700">점수: {totalScore}점 / {maxScore}점</p>
              <p className="text-xl text-gray-600 mt-2">뇌 나이: {brainAge}</p>
            </div>

            {/* 영역별 점수 표시 */}
            <div className="mb-6 space-y-4">
              <p className="text-2xl font-bold text-gray-800 text-center mb-4">영역별 점수</p>
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
                  <div key={category} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-xl text-gray-700">{category}</span>
                      <span className={`text-xl ${isNormal ? 'text-green-600' : 'text-red-600'}`}>
                        {score}/{max} {isNormal ? '✓' : '⚠'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className={`h-6 rounded-full transition-all ${
                          percent >= normalRange.min ? 'bg-green-500' : percent >= normalRange.min - 10 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    {feedback && (
                      <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                        <p className="text-base text-red-800 leading-relaxed">{feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mb-8 p-6 bg-green-50 rounded-2xl">
              <p className="text-2xl leading-relaxed text-center text-gray-800 mb-3">
                검사 결과가 걱정되시나요?
              </p>
              <p className="text-xl leading-relaxed text-center text-gray-700 mb-3">
                지금 보신 결과를 바탕으로<br />
                <span className="font-bold">전문 상담사가 직접 분석</span>해드리고,<br />
                맞춤형 건강 관리 가이드를<br />
                무료로 안내해드릴까요?
              </p>
              <div className="bg-white p-4 rounded-xl mb-4 border-l-4 border-[#EF6C00]">
                <p className="text-lg leading-relaxed text-center text-gray-800">
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
                className="w-full min-h-[60px] h-16 px-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-[#2E7D32] focus:outline-none mb-4"
              />
              <button
                onClick={() => {
                  if (gameState.phoneNumber) {
                    alert(`전화번호 ${gameState.phoneNumber}로 상세 리포트와 건강 관리 가이드를 전송하겠습니다!\n\n전문 상담사가 곧 연락드려 건강 점검과 보장 대비 상담을 도와드리겠습니다. (실제 구현 시 백엔드 API 연동 필요)`);
                  } else {
                    alert('전화번호를 입력해주세요.');
                  }
                }}
                className="w-full min-h-[60px] h-16 bg-[#EF6C00] text-white text-2xl font-bold rounded-2xl hover:bg-[#E65100] active:bg-[#E65100] transition-colors shadow-lg touch-manipulation"
              >
                무료 리포트 및 건강 관리 가이드 받기
              </button>
              <p className="text-sm text-center text-gray-500 mt-3">
                * 개인정보는 건강 상담 목적으로만 사용됩니다
              </p>
            </div>
            <button
              onClick={() => {
                setGameState({ currentStep: -1, answers: {}, memoryItems: [], userProfile: { gender: '', age: 0 }, phoneNumber: '' });
              }}
              className="w-full min-h-[60px] h-16 bg-gray-300 text-gray-800 text-2xl font-bold rounded-2xl hover:bg-gray-400 active:bg-gray-400 transition-colors shadow-lg touch-manipulation"
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
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8 bg-gradient-to-b from-green-50 to-orange-50">
          <div className="text-8xl mb-4 animate-bounce">🐻</div>
          <div className="bg-white rounded-3xl p-8 shadow-lg w-full text-center">
            <p className="text-3xl font-bold text-[#2E7D32] mb-4">
              잠시 쉬어가세요! 😊
            </p>
            <p className="text-2xl text-gray-700">
              다음 문제가 곧 시작됩니다...
            </p>
          </div>
        </div>
      );
    }

    // 문제 화면
    const question = QUIZ_QUESTIONS[gameState.currentStep];
    const currentAnswer = gameState.answers[question.id];

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-4 bg-gradient-to-b from-green-50 to-orange-50">
        {renderProgressBar()}
        <div className="flex items-center justify-between w-full mb-2">
          <div className="text-2xl text-gray-600">
            {gameState.currentStep + 1} / {TOTAL_QUESTIONS}
          </div>
          {question.timeLimit && gameState.timeRemaining !== undefined && (
            <div 
              className={`text-4xl font-bold transition-all duration-300 ${
                gameState.timeRemaining <= 5 
                  ? 'text-red-600 animate-pulse scale-110' 
                  : gameState.timeRemaining <= 10
                    ? 'text-orange-500'
                    : 'text-orange-400'
              }`}
            >
              ⏱ {gameState.timeRemaining}초
              {gameState.timeRemaining <= 5 && (
                <span className="ml-2 text-2xl">⚠️</span>
              )}
            </div>
          )}
        </div>
        <div className="text-6xl mb-4">🐻</div>
        <div className="bg-white rounded-3xl p-6 shadow-lg w-full">
          <p className="text-3xl leading-relaxed text-center text-gray-800 mb-6">
            {question.questionText}
          </p>

          {/* 기억 입력 (Q1) */}
          {question.type === 'memory-input' && (
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="grid grid-cols-3 gap-4 w-full">
                {(question.correctAnswer as string[]).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#EF6C00] text-white p-6 rounded-2xl text-center shadow-md min-h-[100px] flex items-center justify-center"
                  >
                    <div className="text-3xl font-bold">{item}</div>
                  </div>
                ))}
              </div>
              <p className="text-xl text-center text-gray-600">
                3초 후 자동으로 넘어갑니다...
              </p>
            </div>
          )}

          {/* 시계 선택 */}
          {question.type === 'clock' && (
            <div className="grid grid-cols-2 gap-4">
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
                    className={`min-h-[140px] h-36 rounded-2xl transition-all shadow-lg touch-manipulation flex items-center justify-center ${
                      currentAnswer === option
                        ? 'bg-[#2E7D32] border-4 border-[#1B5E20] scale-105'
                        : 'bg-white border-2 border-gray-300 hover:border-[#2E7D32] active:scale-95'
                    }`}
                  >
                    <div className="relative w-24 h-24 rounded-full border-4 border-gray-800">
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
            <div className="grid grid-cols-2 gap-4">
              {question.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, option)}
                  className={`min-h-[60px] h-20 text-2xl font-bold rounded-2xl transition-colors shadow-lg touch-manipulation ${
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

          {/* 숫자 거꾸로 입력 (Q2) */}
          {question.type === 'reverse-number-input' && (
            <div className="space-y-6">
              {/* 숫자 표시 (1초 간격으로 하나씩 표시) */}
              <ReverseNumberDisplay sequence={[2, 9, 4, 8]} />
              
              {/* 입력된 숫자 표시 */}
              <div className="bg-gray-100 p-4 rounded-xl text-center">
                <div className="text-xl text-gray-600 mb-2">입력한 숫자:</div>
                <div className="text-4xl font-bold text-gray-800 min-h-[60px] flex items-center justify-center gap-2">
                  {(currentAnswer as number[])?.map((num, idx) => (
                    <span key={idx} className="px-2">{num}</span>
                  )) || <span className="text-gray-400">-</span>}
                </div>
              </div>

              {/* 숫자 키패드 */}
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
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
                    className="min-h-[70px] h-20 text-3xl font-bold rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 disabled:bg-gray-100 disabled:text-gray-400 touch-manipulation transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* 삭제 버튼 */}
              {(currentAnswer as number[])?.length > 0 && (
                <button
                  onClick={() => {
                    const current = (currentAnswer as number[]) || [];
                    handleAnswer(question.id, current.slice(0, -1) as number[]);
                  }}
                  className="w-full min-h-[60px] h-16 bg-red-500 text-white text-2xl font-bold rounded-xl hover:bg-red-600 active:bg-red-700 transition-colors touch-manipulation"
                >
                  지우기
                </button>
              )}

              {/* 확인 버튼 (4개 모두 입력 시 자동) */}
              {(currentAnswer as number[])?.length === 4 && (
                <button
                  onClick={handleNextStep}
                  className="w-full min-h-[60px] h-16 bg-[#2E7D32] text-white text-2xl font-bold rounded-2xl hover:bg-[#1B5E20] active:bg-[#1B5E20] transition-colors shadow-lg touch-manipulation"
                >
                  확인하기
                </button>
              )}
            </div>
          )}

          {/* Stroop Test (Q3) */}
          {question.type === 'stroop' && (
            <div className="space-y-6">
              {/* "노랑"이라는 글자가 파란색으로 표시 */}
              <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-2xl">
                <div className="text-7xl font-bold" style={{ color: '#3B82F6' }}>
                  노랑
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {question.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`min-h-[80px] h-24 text-2xl font-bold rounded-2xl transition-colors shadow-lg touch-manipulation ${
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

          {/* 시간 계산 (Q5) */}
          {question.type === 'time-calculation' && (
            <div className="grid grid-cols-2 gap-4">
              {question.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, option)}
                  className={`min-h-[80px] h-24 text-2xl font-bold rounded-2xl transition-colors shadow-lg touch-manipulation ${
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

          {/* 'ㅎ' 찾기 (Q4) */}
          {question.type === 'character-count' && (
            <div className="space-y-6">
              {/* 글자 표시 영역 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl text-center">
                <div className="text-5xl font-bold text-gray-800 leading-relaxed space-y-2">
                  <div>호 호 흐 흐 호</div>
                  <div>후 흐 호</div>
                </div>
                <p className="text-xl text-gray-600 mt-4">
                  "ㅎ"이 몇 개인지 세어보세요
                </p>
              </div>

              {/* 선택 버튼 */}
              <div className="grid grid-cols-2 gap-4">
                {question.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`min-h-[80px] h-24 text-2xl font-bold rounded-2xl transition-colors shadow-lg touch-manipulation ${
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
            <div className="grid grid-cols-2 gap-4">
              {question.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, option)}
                  className={`min-h-[80px] h-24 text-2xl font-bold rounded-2xl transition-colors shadow-lg touch-manipulation ${
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

          {/* 다중 선택 (Q6: 지연 회상) - 3개 선택 */}
          {question.type === 'multi-choice' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {question.options?.map((option, idx) => {
                  const selected = (currentAnswer as string[])?.includes(option) || false;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleMultipleSelect(question.id, option)}
                      disabled={(currentAnswer as string[])?.length >= 5 && !selected}
                      className={`min-h-[60px] h-20 text-xl font-bold rounded-xl transition-all touch-manipulation ${
                        selected
                          ? 'bg-[#2E7D32] text-white scale-105'
                          : (currentAnswer as string[])?.length >= 5
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <p className="text-xl text-center text-gray-600">
                선택된 항목: {(currentAnswer as string[])?.length || 0}개
              </p>
              {(currentAnswer as string[])?.length >= 3 && (
                <button
                  onClick={handleNextStep}
                  className="w-full min-h-[60px] h-16 bg-[#2E7D32] text-white text-2xl font-bold rounded-2xl hover:bg-[#1B5E20] active:bg-[#1B5E20] transition-colors shadow-lg touch-manipulation"
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

  return <main className="min-h-screen bg-gradient-to-b from-green-50 to-orange-50">{renderQuestion()}</main>;
}

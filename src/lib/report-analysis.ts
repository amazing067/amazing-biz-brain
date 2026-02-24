/**
 * 보고서 데이터 JSON을 분석해 추가 인사이트 생성
 * - 월보험료 예상 (참고용)
 * - 다음에 할 일 (다음 단계)
 * - 점검해볼 부분 (취약 영역)
 */
export type ReportAnalysis = {
  stageLabel: string;
  stageKey: string;
  total: number;
  /** 월 보험료 예상 (문구, 참고용) */
  monthlyPremiumRecommend: string;
  /** 월 예상 비용 요약 (2026·10년후·상세·안내) — 이미지처럼 상세 내역 */
  costBreakdown?: string;
  /** 다음에 할 일 */
  nextSteps: string[];
  /** 점검해볼 부분 (취약 영역·주의점) */
  problemAreas: string[];
  /** 한 줄 요약 */
  summary: string;
  /** 동일 나이대 인지 위치 (예: 66세 남성 기준 상위 25% 수준) */
  ageContext?: string;
  /** 치매·경도인지장애 위험 해석 (저/중/고, 과도한 불안 금지) */
  dementiaRiskNote?: string;
  /** 이번 달 할 한 가지 행동 */
  oneActionThisMonth?: string;
};

/** 보고서 데이터로 2026·10년후 월 예상 비용 + 상세 내역 + 안내 문구 생성 (이미지와 동일한 구성) */
export function getCostBreakdownText(data: Record<string, unknown>): string {
  const finalSelfPay = (data.finalSelfPay as number) ?? 0;
  const realGovSupport = (data.realGovSupport as number) ?? 0;
  const futureTotalCost = (data.futureTotalCost as number) ?? 0;
  const futureGovSupport = (data.futureGovSupport as number) ?? 0;
  const futureSelfPay = (data.futureSelfPay as number) ?? 0;
  const details = (data.futureDetails || { caregiver: 0, medical: 0, living: 0 }) as { caregiver?: number; medical?: number; living?: number };
  const caregiver = Math.round((details.caregiver ?? 0) / 100) * 100;
  const medical = Math.round((details.medical ?? 0) / 100) * 100;
  const living = Math.round((details.living ?? 0) / 100) * 100;

  const lines: string[] = [];
  lines.push('■ 2026년 월 예상 비용 (현재 기준)');
  lines.push(`  · 국가 지원금 (최대): ${(realGovSupport || 0).toLocaleString()}원`);
  lines.push(`  · 실제 본인 부담금: ${(finalSelfPay || 0).toLocaleString()}원`);
  lines.push('');
  lines.push('■ 10년 후 (2036년) 월 예상 비용 · 물가상승 반영');
  lines.push(`  · 총 월 예상 비용: ${(futureTotalCost || 0).toLocaleString()}원`);
  lines.push(`  · 국가 지원금 (예상): ${(futureGovSupport || 0).toLocaleString()}원`);
  lines.push(`  · 실제 본인 부담금: ${(futureSelfPay || 0).toLocaleString()}원`);
  lines.push('');
  lines.push('■ 비용 산출 상세 내역 (월 기준)');
  lines.push(`  ① 사적 간병비 (인건비) 최대 부담: ${caregiver.toLocaleString()}원`);
  lines.push('    ※ 아래 「비급여·국가 지원 안내」 참고');
  lines.push(`  ② 병원비/시설비 (급여+비급여): ${medical.toLocaleString()}원`);
  lines.push(`  ③ 식대/소모품 (기저귀 등): ${living.toLocaleString()}원`);
  lines.push(`  ▶ 총 비용 합계 (2036년 예상): ${(futureTotalCost || 0).toLocaleString()}원`);
  lines.push(`  - 국가 지원금 (예상): ${(futureGovSupport || 0).toLocaleString()}원`);
  lines.push(`  = 실제 본인 부담금: ${(futureSelfPay || 0).toLocaleString()}원`);
  lines.push('');
  lines.push('■ 국가 지원금·급여 안내');
  lines.push('  · 장기요양보험: 등급별 월 한도 내 서비스 이용 시 본인부담금은 일반 15%, 경감대상자 9% 또는 6%입니다. 인지지원등급 2025년 재가급여 월 한도액 약 65.7만원(2024년 64.4만원 대비 인상)입니다.');
  lines.push('  · 국가는 장기요양보험료 예상수입의 약 20%를 공단에 지원합니다. 위 「국가 지원금」은 등급·이용량에 따라 달라집니다.');
  lines.push('');
  lines.push('■ 비급여 항목 안내 (전액 본인 부담)');
  lines.push('  · 장기요양보험 비급여: 식사재료비(식대), 이·미용비, 상급침실 이용 추가비용, 기타 보건복지부 고시 일상생활 비용 등은 급여 외로 전액 본인 부담입니다.');
  lines.push('  · 사적 간병비(간병인 고용비): 건강보험·장기요양보험·실손보험 모두 적용되지 않습니다. 실손보험은 의료행위에 해당하는 비용만 보장하며 간병 인건비는 보장 제외입니다. 치매(장기요양)간병보험으로만 준비할 수 있습니다.');
  lines.push('');
  lines.push('■ 권장 사항');
  const man = futureSelfPay >= 10000 ? `${Math.round(futureSelfPay / 10000)}만` : `${futureSelfPay.toLocaleString()}`;
  lines.push(`  · 예상 본인 부담금(월 약 ${man}원)이 가족(자녀)에게 경제적 부담이 될 수 있으므로, 치매간병보험·장기요양 등급 활용·지원 제도 상담을 권장합니다.`);
  return lines.join('\n');
}

/** 월 예상 비용 요약 중 부가설명만 (국가 지원금·비급여·권장 사항) — 이미지에 나온 3개 블록만 */
export function getCostBreakdownExplanationOnly(data: Record<string, unknown>): string {
  const futureSelfPay = (data.futureSelfPay as number) ?? 0;
  const lines: string[] = [];
  lines.push('■ 국가 지원금·급여 안내');
  lines.push('  · 장기요양보험: 등급별 월 한도 내 서비스 이용 시 본인부담금은 일반 15%, 경감대상자 9% 또는 6%입니다. 인지지원등급 2025년 재가급여 월 한도액 약 65.7만원(2024년 64.4만원 대비 인상)입니다.');
  lines.push('  · 국가는 장기요양보험료 예상수입의 약 20%를 공단에 지원합니다. 위 「국가 지원금」은 등급·이용량에 따라 달라집니다.');
  lines.push('');
  lines.push('■ 비급여 항목 안내 (전액 본인 부담)');
  lines.push('  · 장기요양보험 비급여: 식사재료비(식대), 이·미용비, 상급침실 이용 추가비용, 기타 보건복지부 고시 일상생활 비용 등은 급여 외로 전액 본인 부담입니다.');
  lines.push('  · 사적 간병비(간병인 고용비): 건강보험·장기요양보험·실손보험 모두 적용되지 않습니다. 실손보험은 의료행위에 해당하는 비용만 보장하며 간병 인건비는 보장 제외입니다. 치매(장기요양)간병보험으로만 준비할 수 있습니다.');
  lines.push('');
  lines.push('■ 권장 사항');
  const man = futureSelfPay >= 10000 ? `${Math.round(futureSelfPay / 10000)}만` : `${futureSelfPay.toLocaleString()}`;
  lines.push(`  · 예상 본인 부담금(월 약 ${man}원)이 가족(자녀)에게 경제적 부담이 될 수 있으므로, 치매간병보험·장기요양 등급 활용·지원 제도 상담을 권장합니다.`);
  return lines.join('\n');
}

/** 부가설명 1용 요점만 짧게 (가독성·배지용) */
export function getCostBreakdownExplanationShort(data: Record<string, unknown>): string {
  const futureSelfPay = (data.futureSelfPay as number) ?? 0;
  const man = futureSelfPay >= 10000 ? `${Math.round(futureSelfPay / 10000)}만` : `${futureSelfPay.toLocaleString()}`;
  const lines: string[] = [];
  lines.push('■ 국가 지원금·급여 안내');
  lines.push('  · 등급별 월 한도 내 이용 시 본인부담 15%(경감 9%·6%). 인지지원 2025년 월 한도 약 65.7만원.');
  lines.push('  · 국가 지원금은 등급·이용량에 따라 달라집니다.');
  lines.push('');
  lines.push('■ 비급여 (전액 본인 부담)');
  lines.push('  · 식대·이미용·상급침실 등은 급여 외 전액 본인 부담.');
  lines.push('  · 간병인 고용비는 건강보험·실손 미적용. 치매간병보험으로만 준비.');
  lines.push('');
  lines.push('■ 권장');
  lines.push(`  · 예상 부담(월 약 ${man})이 가족 부담이 될 수 있어, 치매간병보험·지원 제도 상담 권장.`);
  return lines.join('\n');
}

function getStage(total: number): { label: string; key: string } {
  if (total >= 80) return { label: '좋음', key: 'good' };
  if (total >= 60) return { label: '보통', key: 'normal' };
  if (total >= 40) return { label: '양호', key: 'fair' };
  if (total >= 20) return { label: '주의', key: 'caution' };
  return { label: '위험', key: 'danger' };
}

/** 영역별 구체적 점검·훈련 권장 (무엇을 하면 좋은지) */
const CATEGORY_CONCRETE_TIPS: Record<string, string> = {
  기억력: '이름·약속·물건 둔 곳을 메모하고, 매일 같은 시간에 복용·일과를 확인하는 습관이 도움이 됩니다.',
  지남력: '날짜·요일·장소를 말로 확인하고, 일기나 사진으로 하루를 정리해 보세요.',
  계산력: '일상에서 간단한 거스름돈 계산, 작은 쇼핑 후 합계 맞추기 등을 해 보세요.',
  시공간: '퍼즐, 블록 쌓기, 지도 보며 길 찾기, 그림 그리기 등이 도움이 됩니다.',
  집행기능: '할 일을 3단계로 나누어 하나씩 진행하고, 요리·정리처럼 순서가 있는 일을 해 보세요.',
  판단력: '가족과 돌봄·비상 시 대처 방법을 미리 이야기해 두고, 중요한 결정은 메모해 두세요.',
  작업기억: '숫자 거꾸로 말하기, 할 일 목록을 적고 당일 확인하기, 짧은 문장 따라 말하기 등이 도움이 됩니다.',
  억제능력: '한 가지 일을 끝낸 뒤 다음으로 넘기기, 충동적으로 말하기 전에 한 번 멈추는 연습을 해 보세요.',
  주의력: '한 가지 일에 10~15분씩 집중하는 습관을 들이고, TV·휴대폰 등 방해 요소를 줄여 보세요.',
  반응속도: '간단한 반응 게임, 손놀림·발놀림이 있는 가벼운 운동을 꾸준히 해 보세요.',
  시각탐색: '숫자·그림 찾기, 숨은그림찾기, 같은 모양 고르기 등이 도움이 됩니다.',
  시각추론: '패턴 맞추기, 다음에 올 도형 맞추기, 간단한 퍼즐을 해 보세요.',
  언어유창성: '하루에 단어 5~10개 떠올려 말하기, 신문·책을 소리 내어 읽기, 대화할 기회를 늘려 보세요.',
};
export function getConcreteTipForCategory(cat: string): string {
  return CATEGORY_CONCRETE_TIPS[cat] || '일상에서 해당 영역을 쓰는 활동(메모, 대화, 간단한 문제 풀기 등)을 꾸준히 해 보세요.';
}

/** AI 등에서 넘어온 점검해볼 부분 문장에 '해당 영역 점검·훈련을 권장' 등 일반 문구가 있으면 영역별 구체 문구로 치환 */
const GENERIC_PHRASES = [
  '해당 영역 점검·훈련을 권장합니다',
  '해당 영역 점검·검진을 권장합니다',
  '일상 관리와 훈련·검진을 권장합니다',
  '주기적으로 확인하세요',
  '점검·훈련을 권장합니다',
  '훈련·검진을 권장합니다',
];
export function enrichProblemAreasWithConcreteTips(lines: string[]): string[] {
  if (!Array.isArray(lines) || lines.length === 0) return lines;
  const categories = Object.keys(CATEGORY_CONCRETE_TIPS);
  return lines.map((line) => {
    const trimmed = line.trim();
    for (const cat of categories) {
      if (!trimmed.startsWith(cat) && !trimmed.startsWith(cat + ' ') && !trimmed.includes(cat + ' 영역') && !trimmed.includes(cat + '이(')) continue;
      const hasGeneric = GENERIC_PHRASES.some((p) => trimmed.includes(p));
      if (!hasGeneric) break;
      const tip = getConcreteTipForCategory(cat);
      let out = trimmed;
      for (const p of GENERIC_PHRASES) {
        if (out.includes(p)) {
          out = out.replace(p, tip);
          break;
        }
      }
      return out;
    }
    return line;
  });
}

export function analyzeReport(data: Record<string, unknown>): ReportAnalysis {
  const total = (data.total as number) ?? 0;
  const age = data.age != null ? Number(data.age) : 65;
  const futureSelfPay = (data.futureSelfPay as number) ?? 0;
  const categoryScores = (data.categoryScores || {}) as Record<string, { percent?: number; max?: number }>;
  const categories = Object.entries(categoryScores).filter(([, v]) => (v?.max ?? 0) > 0);

  const { label: stageLabel, key: stageKey } = getStage(total);

  // 월보험료 예상 (단계별로 구간·톤 차이, 권장 보험료 7~15만원 대역 유지)
  const monthlyPremiumRecommend =
    total >= 80
      ? '현재 인지 수준이 양호해도, 향후 간병·치매 대비로 실손·간병 보험 월 7~12만원 구간 점검·가입 상담을 권장합니다.'
      : total >= 60
        ? '간병·장기요양 보험 월 7~15만원 구간 가입을 권장합니다. 나이와 건강에 따라 전문 설계사 상담으로 맞춤 플랜을 확인하세요.'
        : total >= 40
          ? '간병·실손 보험 월 8~15만원 구간 적극 검토를 권장합니다. 전문 설계사 상담으로 맞춤 플랜을 확인하세요.'
          : total >= 20
            ? '고위험 대비로 월 10~15만원 구간 간병·장기요양 보험 상담을 권장합니다. 정밀 검사 후 보장 설계를 함께 진행하세요.'
            : '의료·정밀 검사와 함께 월 10~15만원 이상 구간 보장 설계 상담을 권장합니다. 가족 부담 완화를 위해 조기 설계가 중요합니다.';

  // 다음에 할 일
  const nextSteps: string[] = [];
  if (total >= 80) {
    nextSteps.push('규칙적인 수면·운동·사회 활동을 유지하세요.');
    nextSteps.push('1년에 1회 정도 인지 검진으로 변화를 확인하세요.');
    nextSteps.push('실손·간병 보험 가입 여부를 점검하고, 미가입 시 저렴한 구간부터 검토하세요.');
  } else if (total >= 60) {
    nextSteps.push('주기적인 인지 검진(6개월~1년)으로 추이를 살펴보세요.');
    nextSteps.push('간병·장기요양 보험 가입을 검토하고, 전문 상담을 받아보세요.');
    nextSteps.push('기억력·집중력 훈련(독서, 단어 맞추기 등)을 습관화하세요.');
  } else if (total >= 40) {
    nextSteps.push('의료기관 인지 정밀 검사를 받아 보세요.');
    nextSteps.push('간병·실손 보험을 적극 검토하고, 본인 부담 예상액을 고려해 보장을 설계하세요.');
    nextSteps.push('가족과 함께 돌봄·경제적 부담에 대해 미리 이야기해 두세요.');
  } else {
    nextSteps.push('가능한 빨리 의료기관 정밀 검사(치매 클리닉 등)를 받으세요.');
    nextSteps.push('보험 설계사와 상담해 간병비·장기요양 보장을 설계하세요.');
    nextSteps.push('가족·돌봄 계획과 재정 준비를 함께 정리하세요.');
  }
  if (futureSelfPay > 0) {
    nextSteps.push(`현재 추정 본인 부담금(월 약 ${(futureSelfPay / 10000).toFixed(0)}만원)을 고려해 보험으로 일부 전환할 수 있는지 상담하세요.`);
  }

  // 점검해볼 부분 — 영역별 percent가 60 미만이거나 가장 낮은 영역
  const problemAreas: string[] = [];
  const entries = categories.map(([cat]) => ({ cat, percent: categoryScores[cat]?.percent ?? 0 }));
  const low = entries.filter((e) => e.percent < 60).sort((a, b) => a.percent - b.percent);
  const minPercent = entries.length ? Math.min(...entries.map((e) => e.percent)) : 0;
  if (low.length > 0) {
    low.forEach(({ cat, percent }) => {
      const tip = getConcreteTipForCategory(cat);
      const tail = percent < 40 ? ' 일상 관리와 정기 검진도 권장합니다.' : ' 주기적으로 확인하세요.';
      problemAreas.push(`${cat} 영역이 ${percent}%로 상대적으로 낮습니다. ${tip}${tail}`);
    });
  }
  if (entries.length && minPercent < 100) {
    const weakest = entries.find((e) => e.percent === minPercent);
    if (weakest && !problemAreas.some((p) => p.startsWith(weakest.cat))) {
      const tip = getConcreteTipForCategory(weakest.cat);
      problemAreas.push(`${weakest.cat}이(가) 다른 영역 대비 가장 낮습니다(${minPercent}%). ${tip}`);
    }
  }
  if (total < 60 && problemAreas.length === 0) {
    problemAreas.push('전체 인지 점수가 60점 미만으로, 정밀 검사와 생활 습관 점검이 필요합니다.');
  }
  if (age >= 65 && total < 80) {
    problemAreas.push('65세 이상이시므로, 간병·장기요양 보험과 지원 제도를 미리 알아두시는 것이 좋습니다.');
  }

  const summary =
    problemAreas.length > 0
      ? `${stageLabel} 단계입니다. ${problemAreas[0]} ${nextSteps[0]}`
      : `${stageLabel} 단계입니다. ${nextSteps[0]}`;

  // 동일 나이대 인지 위치 (로컬용 — AI 없을 때 Part2 이미지·관리자 표시용)
  const ageContext =
    total >= 80
      ? `같은 나이대에서 인지 기능이 상위 20~30% 수준으로 추정됩니다.`
      : total >= 60
        ? `같은 나이대에서 정상 범위에 가깝습니다.`
        : total >= 40
          ? `같은 나이대 대비 일부 영역을 점검해 보시는 것이 좋습니다.`
          : `같은 나이대에서 정밀 검사·상담을 권장하는 구간으로 보입니다.`;

  // 치매·인지 위험 해석 (로컬용). 등급은 검진 점수로 추정한 것이며 실제 공단 판정이 아님을 유지.
  const grade = (data.grade as string) ?? '';
  const isEstimatedHighCare = /[1-5]등급|치매환자|경증|중등도/.test(grade);
  const dementiaRiskNote =
    total >= 80
      ? `현재 검진 결과만으로는 치매 고위험군으로 보기 어렵고, 정기 검진으로 변화를 관찰하는 것이 좋습니다.`
      : total >= 60
        ? `선별 관점에서 저위험 구간에 해당할 수 있습니다. 주기적인 검진을 권장합니다.`
        : total >= 40
          ? `경도인지장애 가능성을 염두에 두고, 의료기관 정밀 검사나 상담을 고려해 보세요.`
          : isEstimatedHighCare
            ? `검진 결과상 해당 등급 구간으로 추정될 수 있습니다. 실제 장기요양 등급은 공단 인정 심사 후 결정됩니다. 정밀 검사와 보험·지원 제도 상담을 함께 진행하시는 것을 권장합니다.`
            : `정밀 검사와 보험·지원 제도 상담을 함께 진행하시는 것을 권장합니다.`;

  // 이번 달 한 가지 행동 (로컬용)
  const oneActionThisMonth =
    total >= 80
      ? '이번 달에 실손·간병 보험 점검 또는 견적 1건 받아보기.'
      : total >= 60
        ? '이번 달에 간병·장기요양 보험 상담 1회 예약하기.'
        : total >= 40
          ? '이번 달에 인지 정밀 검사 예약 및 보험 설계 상담 받기.'
          : '이번 달에 치매 클리닉 등 정밀 검사와 보험 상담을 동시에 진행하기.';

  return {
    stageLabel,
    stageKey,
    total,
    monthlyPremiumRecommend,
    costBreakdown: getCostBreakdownText(data),
    nextSteps,
    problemAreas,
    summary,
    ageContext,
    dementiaRiskNote,
    oneActionThisMonth,
  };
}
